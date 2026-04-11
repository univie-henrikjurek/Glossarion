from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import Dictionary, DictionaryMember, Entry, Translation, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/dictionaries", tags=["dictionaries"])


class DictionaryCreate(BaseModel):
    name: str
    source_language: str = "de"


class DictionaryUpdate(BaseModel):
    name: Optional[str] = None
    source_language: Optional[str] = None


class DictionaryMemberResponse(BaseModel):
    user_id: str
    username: str
    email: str
    role: str
    invited_at: datetime


class DictionaryResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    source_language: str
    created_at: datetime
    role: str  # current user's role
    member_count: int
    entry_count: int


class DictionaryDetailResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    source_language: str
    created_at: datetime
    updated_at: datetime
    role: str
    members: list[DictionaryMemberResponse]
    
    class Config:
        from_attributes = True


async def get_user_dictionary_access(
    dictionary_id: str,
    db: AsyncSession,
    current_user: User,
    require_role: Optional[list[str]] = None
) -> tuple[Dictionary, DictionaryMember]:
    result = await db.execute(
        select(Dictionary).where(Dictionary.id == dictionary_id)
    )
    dictionary = result.scalar_one_or_none()
    
    if not dictionary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dictionary not found"
        )
    
    member_result = await db.execute(
        select(DictionaryMember).where(
            DictionaryMember.dictionary_id == dictionary_id,
            DictionaryMember.user_id == current_user.id
        )
    )
    membership = member_result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this dictionary"
        )
    
    if require_role and membership.role not in require_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You need {' or '.join(require_role)} role for this action"
        )
    
    return dictionary, membership


@router.get("", response_model=list[DictionaryResponse])
async def list_dictionaries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DictionaryMember)
        .where(DictionaryMember.user_id == current_user.id)
    )
    memberships = result.scalars().all()
    
    dictionaries = []
    for membership in memberships:
        dict_result = await db.execute(
            select(Dictionary).where(Dictionary.id == membership.dictionary_id)
        )
        dictionary = dict_result.scalar_one()
        
        entries_result = await db.execute(
            select(Entry).where(Entry.dictionary_id == dictionary.id)
        )
        entry_count = len(entries_result.scalars().all())
        
        members_result = await db.execute(
            select(DictionaryMember).where(DictionaryMember.dictionary_id == dictionary.id)
        )
        member_count = len(members_result.scalars().all())
        
        dictionaries.append(DictionaryResponse(
            id=str(dictionary.id),
            name=dictionary.name,
            owner_id=str(dictionary.owner_id),
            source_language=dictionary.source_language,
            created_at=dictionary.created_at,
            role=membership.role,
            member_count=member_count,
            entry_count=entry_count
        ))
    
    return dictionaries


@router.post("", response_model=DictionaryResponse)
async def create_dictionary(
    data: DictionaryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dictionary = Dictionary(
        name=data.name,
        owner_id=current_user.id,
        source_language=data.source_language
    )
    db.add(dictionary)
    await db.flush()
    
    owner_membership = DictionaryMember(
        dictionary_id=dictionary.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(owner_membership)
    await db.commit()
    await db.refresh(dictionary)
    
    return DictionaryResponse(
        id=str(dictionary.id),
        name=dictionary.name,
        owner_id=str(dictionary.owner_id),
        source_language=dictionary.source_language,
        created_at=dictionary.created_at,
        role="owner",
        member_count=1,
        entry_count=0
    )


@router.get("/{dictionary_id}", response_model=DictionaryDetailResponse)
async def get_dictionary(
    dictionary_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dictionary, membership = await get_user_dictionary_access(
        dictionary_id, db, current_user
    )
    
    members_result = await db.execute(
        select(DictionaryMember, User)
        .join(User, DictionaryMember.user_id == User.id)
        .where(DictionaryMember.dictionary_id == dictionary_id)
    )
    members_data = members_result.all()
    
    members = [
        DictionaryMemberResponse(
            user_id=str(user.id),
            username=user.username,
            email=user.email,
            role=member.role,
            invited_at=member.invited_at
        )
        for member, user in members_data
    ]
    
    return DictionaryDetailResponse(
        id=str(dictionary.id),
        name=dictionary.name,
        owner_id=str(dictionary.owner_id),
        source_language=dictionary.source_language,
        created_at=dictionary.created_at,
        updated_at=dictionary.updated_at,
        role=membership.role,
        members=members
    )


@router.put("/{dictionary_id}", response_model=DictionaryResponse)
async def update_dictionary(
    dictionary_id: str,
    data: DictionaryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dictionary, membership = await get_user_dictionary_access(
        dictionary_id, db, current_user, require_role=["owner", "editor"]
    )
    
    if data.name is not None:
        dictionary.name = data.name
    if data.source_language is not None:
        dictionary.source_language = data.source_language
    
    await db.commit()
    await db.refresh(dictionary)
    
    members_result = await db.execute(
        select(DictionaryMember).where(DictionaryMember.dictionary_id == dictionary.id)
    )
    member_count = len(members_result.scalars().all())
    
    entries_result = await db.execute(
        select(Entry).where(Entry.dictionary_id == dictionary.id)
    )
    entry_count = len(entries_result.scalars().all())
    
    return DictionaryResponse(
        id=str(dictionary.id),
        name=dictionary.name,
        owner_id=str(dictionary.owner_id),
        source_language=dictionary.source_language,
        created_at=dictionary.created_at,
        role=membership.role,
        member_count=member_count,
        entry_count=entry_count
    )


@router.delete("/{dictionary_id}")
async def delete_dictionary(
    dictionary_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dictionary, membership = await get_user_dictionary_access(
        dictionary_id, db, current_user, require_role=["owner"]
    )
    
    await db.delete(dictionary)
    await db.commit()
    
    return {"message": "Dictionary deleted successfully"}


@router.get("/{dictionary_id}/members", response_model=list[DictionaryMemberResponse])
async def list_members(
    dictionary_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_user_dictionary_access(dictionary_id, db, current_user)
    
    members_result = await db.execute(
        select(DictionaryMember, User)
        .join(User, DictionaryMember.user_id == User.id)
        .where(DictionaryMember.dictionary_id == dictionary_id)
    )
    members_data = members_result.all()
    
    return [
        DictionaryMemberResponse(
            user_id=str(user.id),
            username=user.username,
            email=user.email,
            role=member.role,
            invited_at=member.invited_at
        )
        for member, user in members_data
    ]


@router.put("/{dictionary_id}/members/{user_id}")
async def update_member_role(
    dictionary_id: str,
    user_id: str,
    role: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_user_dictionary_access(dictionary_id, db, current_user, require_role=["owner"])
    
    member_result = await db.execute(
        select(DictionaryMember).where(
            DictionaryMember.dictionary_id == dictionary_id,
            DictionaryMember.user_id == user_id
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    if role not in ["editor", "viewer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'editor' or 'viewer'"
        )
    
    member.role = role
    await db.commit()
    
    return {"message": "Member role updated"}


@router.delete("/{dictionary_id}/members/{user_id}")
async def remove_member(
    dictionary_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await get_user_dictionary_access(dictionary_id, db, current_user, require_role=["owner"])
    
    member_result = await db.execute(
        select(DictionaryMember).where(
            DictionaryMember.dictionary_id == dictionary_id,
            DictionaryMember.user_id == user_id
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove owner"
        )
    
    await db.delete(member)
    await db.commit()
    
    return {"message": "Member removed"}
