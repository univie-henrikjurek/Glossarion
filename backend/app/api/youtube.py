from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import httpx

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

@router.get("/search")
async def search_youtube(q: str):
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://www.youtube.com/results",
                params={"search_query": q},
                timeout=10.0
            )
            html = response.text
            
            videos = []
            import re
            
            ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
            titles = re.findall(r'"title":{"runs":\[{"text":"([^"]+)"}', html.replace("\\u0026", "&"))
            channels = re.findall(r'"longBylineText":{"simpleText":"([^"]+)"', html)
            
            for i, video_id in enumerate(ids[:6]):
                videos.append({
                    "id": video_id,
                    "title": titles[i] if i < len(titles) else f"Video {i+1}",
                    "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                    "channel": channels[i] if i < len(channels) else ""
                })
            
            return {"videos": videos}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"YouTube search failed: {str(e)}")