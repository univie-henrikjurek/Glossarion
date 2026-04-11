from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Invitation, Dictionary, DictionaryMember, User
from app.api.auth import get_current_user
from app.api.dictionaries import get_user_dictionary_access

router = APIRouter(prefix="/api/invitations", tags=["invitations"])


class InvitationCreate(BaseModel):
    role: str = "editor"
    expires_days: int = 7


class InvitationResponse(BaseModel):
    id: str
    dictionary_id: str
    dictionary_name: str
    token: str
    role: str
    expires_at: datetime
    created_at: datetime
    accepted: str
    
    class Config:
        from_attributes = True


class InvitationInfoResponse(BaseModel):
    dictionary_name: str
    dictionary_id: str
    role: str
    invited_by: str
    expires_at: datetime
    already_member: bool


@router.post("/dictionaries/{dictionary_id}/invite", response_model=InvitationResponse)
async def create_invitation(
    dictionary_id: str,
    data: InvitationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dictionary, membership = await get_user_dictionary_access(
        dictionary_id, db, current_user, require_role=["owner", "editor"]
    )
    
    token = Invitation.generate_token()
    
    invitation = Invitation(
        dictionary_id=dictionary_id,
        token=token,
        role=data.role,
        created_by=current_user.id,
        expires_at=Invitation.get_expiry(data.expires_days)
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    return InvitationResponse(
        id=str(invitation.id),
        dictionary_id=str(invitation.dictionary_id),
        dictionary_name=dictionary.name,
        token=invitation.token,
        role=invitation.role,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
        accepted=invitation.accepted
    )


@router.get("/{token}", response_model=InvitationInfoResponse)
async def get_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.is_expired():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    dict_result = await db.execute(
        select(Dictionary).where(Dictionary.id == invitation.dictionary_id)
    )
    dictionary = dict_result.scalar_one()
    
    creator_result = await db.execute(
        select(User).where(User.id == invitation.created_by)
    )
    creator = creator_result.scalar_one()
    
    already_member_result = await db.execute(
        select(DictionaryMember).where(
            DictionaryMember.dictionary_id == invitation.dictionary_id,
            DictionaryMember.user_id == current_user.id
        )
    )
    already_member = already_member_result.scalar_one_or_none() is not None
    
    return InvitationInfoResponse(
        dictionary_name=dictionary.name,
        dictionary_id=str(dictionary.id),
        role=invitation.role,
        invited_by=creator.username,
        expires_at=invitation.expires_at,
        already_member=already_member
    )


@router.post("/{token}/accept")
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.is_expired():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    if invitation.accepted != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already processed"
        )
    
    existing_result = await db.execute(
        select(DictionaryMember).where(
            DictionaryMember.dictionary_id == invitation.dictionary_id,
            DictionaryMember.user_id == current_user.id
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this dictionary"
        )
    
    membership = DictionaryMember(
        dictionary_id=invitation.dictionary_id,
        user_id=current_user.id,
        role=invitation.role
    )
    db.add(membership)
    
    invitation.accepted = "accepted"
    invitation.accepted_by = current_user.id
    invitation.accepted_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "message": "Invitation accepted successfully",
        "dictionary_id": str(invitation.dictionary_id)
    }


@router.post("/{token}/decline")
async def decline_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invitation.accepted = "declined"
    invitation.accepted_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Invitation declined"}
