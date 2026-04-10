import httpx
from typing import Optional
from dataclasses import dataclass
import re

LANG_CODE_MAP = {
    "en": "English",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
}


@dataclass
class WiktionaryInfo:
    word_type: Optional[str] = None
    gender: Optional[str] = None
    article: Optional[str] = None
    plural: Optional[str] = None
    details: Optional[str] = None


class WiktionaryService:
    def __init__(self):
        self._cache: dict[str, WiktionaryInfo] = {}

    def lookup(self, word: str, lang_code: str) -> WiktionaryInfo:
        cache_key = f"{lang_code}:{word.lower()}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        result = self._fetch_wiktionary(word, lang_code)
        self._cache[cache_key] = result
        return result

    def _fetch_wiktionary(self, word: str, lang_code: str) -> WiktionaryInfo:
        lang_name = LANG_CODE_MAP.get(lang_code, "English")

        try:
            url = f"https://en.wiktionary.org/api/rest_v1/page/html/{word.lower()}"
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)

            if response.status_code != 200:
                return WiktionaryInfo()

            html = response.text

            result = WiktionaryInfo()

            if lang_code == "de":
                result = self._parse_german_html(html)
            elif lang_code == "fr":
                result = self._parse_french_html(html)
            elif lang_code == "it":
                result = self._parse_italian_html(html)
            elif lang_code == "es":
                result = self._parse_spanish_html(html)
            elif lang_code == "en":
                result = self._parse_english_html(html)

            return result

        except httpx.HTTPError as e:
            print(f"Wiktionary lookup error: {e}")
            return WiktionaryInfo()
        except Exception as e:
            print(f"Wiktionary parse error: {e}")
            return WiktionaryInfo()

    def _parse_german_html(self, html: str) -> WiktionaryInfo:
        result = WiktionaryInfo()

        gender_match = re.search(r'<span[^>]*class="["\'].*?\bgender\b.*?["\']"[^>]*>(.*?)</span>', html, re.DOTALL)
        if not gender_match:
            gender_match = re.search(r'\b(der|die|das|den|dem)\b', html, re.IGNORECASE)

        if gender_match:
            match_text = gender_match.group(1) if hasattr(gender_match, 'group') and gender_match.lastindex else gender_match.group(0)
            match_text = match_text.lower().strip()

            if match_text in ["der"]:
                result.article = "der"
                result.gender = "m"
            elif match_text in ["die"]:
                result.article = "die"
                result.gender = "f"
            elif match_text in ["das"]:
                result.article = "das"
                result.gender = "n"

        noun_match = re.search(r'Noun.*?<dd[^>]*>([^<]+)', html, re.DOTALL | re.IGNORECASE)
        if noun_match:
            result.word_type = "noun"

        verb_match = re.search(r'Verb.*?<dd[^>]*>([^<]+)', html, re.DOTALL | re.IGNORECASE)
        if verb_match:
            result.word_type = "verb"

        adj_match = re.search(r'Adjective.*?<dd[^>]*>([^<]+)', html, re.DOTALL | re.IGNORECASE)
        if adj_match:
            result.word_type = "adj"

        if result.article and result.gender:
            result.details = f"{result.article}, {result.gender}"
        elif result.article:
            result.details = result.article

        return result

    def _parse_french_html(self, html: str) -> WiktionaryInfo:
        result = WiktionaryInfo()

        gender_match = re.search(r'\b(le|la|les|un|une)\b', html, re.IGNORECASE)
        if gender_match:
            article = gender_match.group(0).lower()
            if article in ["le", "un"]:
                result.gender = "m"
                result.article = article
            elif article in ["la", "une"]:
                result.gender = "f"
                result.article = article

        noun_match = re.search(r'Noun.*?<dd[^>]*>([^<]+)', html, re.DOTALL | re.IGNORECASE)
        if noun_match:
            result.word_type = "noun"

        if result.article and result.gender:
            result.details = f"{result.article}, {result.gender}"

        return result

    def _parse_italian_html(self, html: str) -> WiktionaryInfo:
        result = WiktionaryInfo()

        gender_match = re.search(r'\b(il|la|lo|un|una|uno)\b', html, re.IGNORECASE)
        if gender_match:
            article = gender_match.group(0).lower()
            if article in ["il", "un", "uno"]:
                result.gender = "m"
                result.article = article
            elif article in ["la", "una"]:
                result.gender = "f"
                result.article = article

        noun_match = re.search(r'Noun.*?<dd[^>]*>([^<]+)', html, re.DOTALL | re.IGNORECASE)
        if noun_match:
            result.word_type = "noun"

        if result.article and result.gender:
            result.details = f"{result.article}, {result.gender}"

        return result

    def _parse_spanish_html(self, html: str) -> WiktionaryInfo:
        result = WiktionaryInfo()

        gender_match = re.search(r'\b(el|la|un|una)\b', html, re.IGNORECASE)
        if gender_match:
            article = gender_match.group(0).lower()
            if article in ["el", "un"]:
                result.gender = "m"
                result.article = article
            elif article in ["la", "una"]:
                result.gender = "f"
                result.article = article

        noun_match = re.search(r'Noun.*?<dd[^>]*>([^<]+)', html, re.DOTALL | re.IGNORECASE)
        if noun_match:
            result.word_type = "noun"

        if result.article and result.gender:
            result.details = f"{result.article}, {result.gender}"

        return result

    def _parse_english_html(self, html: str) -> WiktionaryInfo:
        result = WiktionaryInfo()

        if 'class="noun"' in html.lower() or re.search(r'Noun\s*</span>', html, re.IGNORECASE):
            result.word_type = "noun"
        elif 'class="verb"' in html.lower() or re.search(r'Verb\s*</span>', html, re.IGNORECASE):
            result.word_type = "verb"
        elif 'class="adjective"' in html.lower() or re.search(r'Adjective\s*</span>', html, re.IGNORECASE):
            result.word_type = "adj"

        return result

    def lookup_multiple(self, words: list[tuple[str, str]]) -> dict[str, WiktionaryInfo]:
        results = {}
        for word, lang_code in words:
            results[f"{lang_code}:{word.lower()}"] = self.lookup(word, lang_code)
        return results


_wiktionary_service: Optional[WiktionaryService] = None


def get_wiktionary_service() -> WiktionaryService:
    global _wiktionary_service
    if _wiktionary_service is None:
        _wiktionary_service = WiktionaryService()
    return _wiktionary_service
