import spacy
from typing import Optional
from dataclasses import dataclass

SUPPORTED_LANGUAGES = {
    "en": "en_core_web_sm",
    "de": "de_core_news_sm",
    "fr": "fr_core_news_sm",
    "es": "es_core_news_sm",
    "it": "it_core_news_sm",
}

LANGUAGE_MODELS = {
    "en": "en_core_web_sm",
    "de": "de_core_news_sm",
    "fr": "fr_core_news_sm",
    "es": "es_core_news_sm",
    "it": "it_core_news_sm",
}

POS_TAG_MAP = {
    "NOUN": "noun",
    "VERB": "verb",
    "ADJ": "adj",
    "ADJ_SAT": "adj",
    "PROPN": "noun",
}

GENDER_MAP = {
    "Masc": "m",
    "Fem": "f",
    "Neut": "n",
}


@dataclass
class GrammarInfo:
    word_type: Optional[str] = None
    gender: Optional[str] = None
    article: Optional[str] = None
    details: Optional[str] = None


class GrammarService:
    def __init__(self):
        self._models: dict[str, any] = {}
        self._load_models()

    def _load_models(self):
        for lang_code, model_name in LANGUAGE_MODELS.items():
            try:
                self._models[lang_code] = spacy.load(model_name)
            except OSError:
                print(f"spaCy model {model_name} not found. Run: python -m spacy download {model_name}")

    def _get_model(self, lang_code: str):
        if lang_code not in self._models:
            if lang_code in LANGUAGE_MODELS:
                try:
                    self._models[lang_code] = spacy.load(LANGUAGE_MODELS[lang_code])
                except OSError:
                    return None
            else:
                return None
        return self._models.get(lang_code)

    def analyze(self, text: str, lang_code: str) -> GrammarInfo:
        model = self._get_model(lang_code)
        if not model:
            return GrammarInfo()

        doc = model(text.strip())

        result = GrammarInfo()

        if len(doc) == 0:
            return result

        token = doc[0]

        pos = token.pos_
        result.word_type = POS_TAG_MAP.get(pos)

        if lang_code == "de":
            result.details = self._analyze_german(doc, token)
        elif lang_code == "en":
            result.details = self._analyze_english(doc, token)
        elif lang_code in ["fr", "es", "it"]:
            result.details = self._analyze_romance(doc, token, lang_code)

        return result

    def _analyze_german(self, doc, token) -> Optional[str]:
        parts = []

        gender = None
        if hasattr(token, "morph") and token.morph:
            gender_str = str(token.morph.get("Gender"))
            if gender_str and gender_str != "[]":
                gender = GENDER_MAP.get(gender_str.strip("[]"))

        if doc[0].pos_ in ["NOUN", "PROPN"]:
            if not gender:
                gender_str = str(doc[0].morph.get("Gender"))
                if gender_str and gender_str != "[]":
                    gender = GENDER_MAP.get(gender_str.strip("[]"))

            if gender:
                parts.append(gender)

            number = token.morph.get("Number")
            if number:
                parts.append(str(number[0]).lower() if isinstance(number, list) else str(number).lower())
        elif token.pos_ == "VERB":
            tense = token.morph.get("Tense")
            if tense:
                parts.append(str(tense[0]).lower() if isinstance(tense, list) else str(tense).lower())

        return ", ".join(parts) if parts else None

    def _analyze_english(self, doc, token) -> Optional[str]:
        parts = []

        if token.pos_ == "VERB":
            tense = token.morph.get("Tense")
            if tense:
                parts.append(str(tense[0]).lower() if isinstance(tense, list) else str(tense).lower())

            verb_form = token.morph.get("VerbForm")
            if verb_form and verb_form != ["Inf"]:
                parts.append(str(verb_form[0]).lower() if isinstance(verb_form, list) else str(verb_form).lower())

        elif token.pos_ in ["NOUN", "PROPN"]:
            number = token.morph.get("Number")
            if number:
                parts.append(str(number[0]).lower() if isinstance(number, list) else str(number).lower())

        return ", ".join(parts) if parts else None

    def _analyze_romance(self, doc, token, lang_code: str) -> Optional[str]:
        parts = []

        if token.pos_ in ["NOUN", "PROPN"]:
            gender = token.morph.get("Gender")
            if gender:
                parts.append(str(gender[0]).lower() if isinstance(gender, list) else str(gender).lower())

            number = token.morph.get("Number")
            if number:
                parts.append(str(number[0]).lower() if isinstance(number, list) else str(number).lower())

        elif token.pos_ == "VERB":
            tense = token.morph.get("Tense")
            if tense:
                parts.append(str(tense[0]).lower() if isinstance(tense, list) else str(tense).lower())

        return ", ".join(parts) if parts else None

    def analyze_batch(self, texts: list[tuple[str, str]]) -> dict[str, GrammarInfo]:
        results = {}
        for text, lang_code in texts:
            results[f"{lang_code}:{text}"] = self.analyze(text, lang_code)
        return results


_grammar_service: Optional[GrammarService] = None


def get_grammar_service() -> GrammarService:
    global _grammar_service
    if _grammar_service is None:
        _grammar_service = GrammarService()
    return _grammar_service
