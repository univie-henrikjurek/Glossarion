from app.api.entries import router as entries_router
from app.api.translations import router as translations_router
from app.api.auth import router as auth_router
from app.api.dictionaries import router as dictionaries_router
from app.api.youtube import router as youtube_router

__all__ = ["entries_router", "translations_router", "auth_router", "dictionaries_router", "youtube_router"]
