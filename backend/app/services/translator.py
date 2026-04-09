import httpx
from typing import Optional
from app.config import get_settings

settings = get_settings()


class TranslatorService:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.libretranslate_url
    
    async def translate(
        self,
        text: str,
        source_lang: str = "en",
        target_lang: str = "de"
    ) -> Optional[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/translate",
                    json={
                        "q": text,
                        "source": source_lang,
                        "target": target_lang,
                        "format": "text"
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data.get("translatedText")
            except httpx.HTTPError as e:
                print(f"Translation error: {e}")
                return None
    
    async def translate_to_languages(
        self,
        text: str,
        source_lang: str = "en",
        target_langs: Optional[list[str]] = None
    ) -> dict[str, str]:
        if target_langs is None:
            target_langs = settings.target_language_list
        
        results = {}
        for lang in target_langs:
            if lang != source_lang:
                translated = await self.translate(text, source_lang, lang)
                if translated:
                    results[lang] = translated
        
        return results
    
    async def detect_language(self, text: str) -> Optional[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/detect",
                    json={"q": text}
                )
                response.raise_for_status()
                data = response.json()
                if data and len(data) > 0:
                    return data[0].get("language")
                return None
            except httpx.HTTPError as e:
                print(f"Language detection error: {e}")
                return None
    
    async def get_languages(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(f"{self.base_url}/languages")
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError:
                return []
    
    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/languages")
                return response.status_code == 200
        except httpx.HTTPError:
            return False


def get_translator_service() -> TranslatorService:
    return TranslatorService()
