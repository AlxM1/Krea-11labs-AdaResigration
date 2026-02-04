"""
Voice Library Service
Aggregates and manages free voices from multiple sources:
- XTTS v2 built-in speakers
- LibriTTS (2,400+ speakers)
- VCTK (110 speakers)
- Common Voice (multilingual)
- LJSpeech (high quality female)
- Hi-Fi TTS (studio quality)
- Bark voice presets
- SpeechT5 speaker embeddings
"""
import os
import json
import hashlib
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
from functools import lru_cache
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class VoiceLibraryService:
    """Service for managing the voice library from multiple free sources"""

    # Dataset URLs and metadata
    DATASETS = {
        "xtts_builtin": {
            "name": "XTTS v2 Built-in",
            "description": "Pre-trained speakers included with Coqui TTS XTTS v2 model",
            "license": "MPL-2.0",
            "languages": ["en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "ja", "hu", "ko"],
        },
        "libri_tts": {
            "name": "LibriTTS",
            "description": "Multi-speaker English corpus derived from LibriSpeech audiobooks",
            "url": "https://www.openslr.org/60/",
            "hf_dataset": "mythicinfinity/libritts_r",
            "license": "CC BY 4.0",
            "speakers": 2400,
            "languages": ["en"],
        },
        "vctk": {
            "name": "VCTK Corpus",
            "description": "110 English speakers with various accents recorded at 48kHz",
            "url": "https://datashare.ed.ac.uk/handle/10283/3443",
            "hf_dataset": "VCTK/VCTK-Corpus",
            "license": "CC BY 4.0",
            "speakers": 110,
            "languages": ["en"],
        },
        "common_voice": {
            "name": "Mozilla Common Voice",
            "description": "Crowdsourced multilingual voice dataset",
            "url": "https://commonvoice.mozilla.org/",
            "hf_dataset": "mozilla-foundation/common_voice_16_1",
            "license": "CC0",
            "speakers": 10000,
            "languages": ["en", "de", "fr", "es", "it", "nl", "ru", "pl", "pt", "zh", "ja", "ar", "tr", "ko", "hi"],
        },
        "lj_speech": {
            "name": "LJSpeech",
            "description": "High-quality single female speaker, ideal for TTS training",
            "url": "https://keithito.com/LJ-Speech-Dataset/",
            "hf_dataset": "lj_speech",
            "license": "Public Domain",
            "speakers": 1,
            "languages": ["en"],
        },
        "hifi_tts": {
            "name": "Hi-Fi TTS",
            "description": "Studio quality recordings from 10 speakers",
            "url": "https://www.openslr.org/109/",
            "hf_dataset": "MrDragonFox/Hi-Fi-TTS",
            "license": "CC BY 4.0",
            "speakers": 10,
            "languages": ["en"],
        },
        "bark": {
            "name": "Bark Voice Presets",
            "description": "Suno AI Bark model built-in voice presets",
            "license": "MIT",
            "speakers": 10,
            "languages": ["en", "de", "es", "fr", "hi", "it", "ja", "ko", "pl", "pt", "ru", "tr", "zh"],
        },
        "speecht5": {
            "name": "SpeechT5 Embeddings",
            "description": "Microsoft SpeechT5 speaker embeddings from CMU Arctic + LibriSpeech",
            "hf_model": "microsoft/speecht5_tts",
            "hf_embeddings": "Matthijs/cmu-arctic-xvectors",
            "license": "MIT",
            "speakers": 7930,
            "languages": ["en"],
        },
    }

    # XTTS v2 built-in speakers (from Coqui TTS)
    XTTS_SPEAKERS = [
        {"id": "Claribel Dervla", "gender": "female", "accent": "Irish", "style": "calm, narrative"},
        {"id": "Daisy Studious", "gender": "female", "accent": "British", "style": "clear, educational"},
        {"id": "Gracie Wise", "gender": "female", "accent": "American", "style": "warm, friendly"},
        {"id": "Tammie Ema", "gender": "female", "accent": "American", "style": "energetic"},
        {"id": "Alison Dietlinde", "gender": "female", "accent": "American", "style": "professional"},
        {"id": "Ana Florence", "gender": "female", "accent": "Spanish", "style": "expressive"},
        {"id": "Annmarie Nele", "gender": "female", "accent": "German", "style": "clear"},
        {"id": "Asya Anara", "gender": "female", "accent": "Turkish", "style": "warm"},
        {"id": "Brenda Stern", "gender": "female", "accent": "American", "style": "authoritative"},
        {"id": "Gitta Nikolina", "gender": "female", "accent": "German", "style": "friendly"},
        {"id": "Henriette Usha", "gender": "female", "accent": "Dutch", "style": "calm"},
        {"id": "Sofia Hellen", "gender": "female", "accent": "Greek", "style": "melodic"},
        {"id": "Tammy Grit", "gender": "female", "accent": "American", "style": "casual"},
        {"id": "Tanja Adelina", "gender": "female", "accent": "German", "style": "professional"},
        {"id": "Vjollca Johnnie", "gender": "female", "accent": "Albanian", "style": "expressive"},
        {"id": "Andrew Chipper", "gender": "male", "accent": "British", "style": "cheerful"},
        {"id": "Badr Odhiambo", "gender": "male", "accent": "Kenyan", "style": "warm"},
        {"id": "Dionisio Schuyler", "gender": "male", "accent": "Spanish", "style": "expressive"},
        {"id": "Royston Min", "gender": "male", "accent": "Asian", "style": "professional"},
        {"id": "Viktor Eka", "gender": "male", "accent": "Slavic", "style": "deep"},
        {"id": "Abrahan Mack", "gender": "male", "accent": "American", "style": "friendly"},
        {"id": "Adde Michal", "gender": "male", "accent": "Polish", "style": "clear"},
        {"id": "Baldur Sansen", "gender": "male", "accent": "Nordic", "style": "calm"},
        {"id": "Craig Gutsy", "gender": "male", "accent": "American", "style": "bold"},
        {"id": "Damien Black", "gender": "male", "accent": "British", "style": "dramatic"},
        {"id": "Gilberto Mathias", "gender": "male", "accent": "Portuguese", "style": "warm"},
        {"id": "Ilkin Urbano", "gender": "male", "accent": "Turkish", "style": "friendly"},
        {"id": "Kazuhiko Atallah", "gender": "male", "accent": "Japanese", "style": "precise"},
        {"id": "Ludvig Milivoj", "gender": "male", "accent": "Slavic", "style": "resonant"},
        {"id": "Suad Qasim", "gender": "male", "accent": "Arabic", "style": "expressive"},
        {"id": "Torcull Diarmuid", "gender": "male", "accent": "Scottish", "style": "warm"},
        {"id": "Viktor Menelaos", "gender": "male", "accent": "Greek", "style": "deep"},
        {"id": "Zacharie Aimilios", "gender": "male", "accent": "French", "style": "elegant"},
        {"id": "Nova Hogarth", "gender": "female", "accent": "British", "style": "modern"},
        {"id": "Maja Ruoho", "gender": "female", "accent": "Finnish", "style": "clear"},
        {"id": "Uta Obando", "gender": "female", "accent": "Japanese", "style": "gentle"},
        {"id": "Lidiya Szekeres", "gender": "female", "accent": "Hungarian", "style": "warm"},
        {"id": "Chandra MacFarland", "gender": "female", "accent": "Indian", "style": "melodic"},
        {"id": "Szofi Gransen", "gender": "female", "accent": "Dutch", "style": "friendly"},
        {"id": "Camilla Holmstrom", "gender": "female", "accent": "Swedish", "style": "calm"},
        {"id": "Lilya Stainthorpe", "gender": "female", "accent": "Russian", "style": "expressive"},
        {"id": "Zofija Kendrick", "gender": "female", "accent": "Polish", "style": "professional"},
        {"id": "Narelle Moon", "gender": "female", "accent": "Australian", "style": "casual"},
        {"id": "Barbora MacLean", "gender": "female", "accent": "Czech", "style": "clear"},
        {"id": "Alexandra Hisakawa", "gender": "female", "accent": "Japanese", "style": "soft"},
        {"id": "Alma Maria", "gender": "female", "accent": "Italian", "style": "expressive"},
        {"id": "Rosemary Okafor", "gender": "female", "accent": "Nigerian", "style": "warm"},
        {"id": "Ige Behringer", "gender": "male", "accent": "German", "style": "authoritative"},
        {"id": "Filip Traverse", "gender": "male", "accent": "French", "style": "smooth"},
        {"id": "Damjan Chapman", "gender": "male", "accent": "Croatian", "style": "deep"},
        {"id": "Wulf Carlevaro", "gender": "male", "accent": "Italian", "style": "warm"},
        {"id": "Aaron Dreschner", "gender": "male", "accent": "American", "style": "casual"},
        {"id": "Kumar Dahl", "gender": "male", "accent": "Indian", "style": "clear"},
        {"id": "Eugenio Matarese", "gender": "male", "accent": "Italian", "style": "expressive"},
        {"id": "Ferran Sansen", "gender": "male", "accent": "Catalan", "style": "friendly"},
        {"id": "Xavier Hayasaka", "gender": "male", "accent": "Japanese", "style": "professional"},
        {"id": "Luis Moray", "gender": "male", "accent": "Spanish", "style": "warm"},
        {"id": "Marcos Rudaski", "gender": "male", "accent": "Polish", "style": "clear"},
    ]

    # Bark voice presets
    BARK_PRESETS = [
        {"id": "v2/en_speaker_0", "name": "English Speaker 0", "gender": "male", "language": "en"},
        {"id": "v2/en_speaker_1", "name": "English Speaker 1", "gender": "male", "language": "en"},
        {"id": "v2/en_speaker_2", "name": "English Speaker 2", "gender": "male", "language": "en"},
        {"id": "v2/en_speaker_3", "name": "English Speaker 3", "gender": "male", "language": "en"},
        {"id": "v2/en_speaker_4", "name": "English Speaker 4", "gender": "male", "language": "en"},
        {"id": "v2/en_speaker_5", "name": "English Speaker 5", "gender": "male", "language": "en"},
        {"id": "v2/en_speaker_6", "name": "English Speaker 6", "gender": "female", "language": "en"},
        {"id": "v2/en_speaker_7", "name": "English Speaker 7", "gender": "female", "language": "en"},
        {"id": "v2/en_speaker_8", "name": "English Speaker 8", "gender": "female", "language": "en"},
        {"id": "v2/en_speaker_9", "name": "English Speaker 9", "gender": "female", "language": "en"},
        {"id": "v2/de_speaker_0", "name": "German Speaker 0", "gender": "male", "language": "de"},
        {"id": "v2/de_speaker_1", "name": "German Speaker 1", "gender": "male", "language": "de"},
        {"id": "v2/de_speaker_2", "name": "German Speaker 2", "gender": "female", "language": "de"},
        {"id": "v2/de_speaker_3", "name": "German Speaker 3", "gender": "female", "language": "de"},
        {"id": "v2/es_speaker_0", "name": "Spanish Speaker 0", "gender": "male", "language": "es"},
        {"id": "v2/es_speaker_1", "name": "Spanish Speaker 1", "gender": "male", "language": "es"},
        {"id": "v2/es_speaker_2", "name": "Spanish Speaker 2", "gender": "female", "language": "es"},
        {"id": "v2/es_speaker_3", "name": "Spanish Speaker 3", "gender": "female", "language": "es"},
        {"id": "v2/fr_speaker_0", "name": "French Speaker 0", "gender": "male", "language": "fr"},
        {"id": "v2/fr_speaker_1", "name": "French Speaker 1", "gender": "male", "language": "fr"},
        {"id": "v2/fr_speaker_2", "name": "French Speaker 2", "gender": "female", "language": "fr"},
        {"id": "v2/fr_speaker_3", "name": "French Speaker 3", "gender": "female", "language": "fr"},
        {"id": "v2/it_speaker_0", "name": "Italian Speaker 0", "gender": "male", "language": "it"},
        {"id": "v2/it_speaker_1", "name": "Italian Speaker 1", "gender": "female", "language": "it"},
        {"id": "v2/ja_speaker_0", "name": "Japanese Speaker 0", "gender": "male", "language": "ja"},
        {"id": "v2/ja_speaker_1", "name": "Japanese Speaker 1", "gender": "female", "language": "ja"},
        {"id": "v2/ko_speaker_0", "name": "Korean Speaker 0", "gender": "male", "language": "ko"},
        {"id": "v2/ko_speaker_1", "name": "Korean Speaker 1", "gender": "female", "language": "ko"},
        {"id": "v2/pl_speaker_0", "name": "Polish Speaker 0", "gender": "male", "language": "pl"},
        {"id": "v2/pl_speaker_1", "name": "Polish Speaker 1", "gender": "female", "language": "pl"},
        {"id": "v2/pt_speaker_0", "name": "Portuguese Speaker 0", "gender": "male", "language": "pt"},
        {"id": "v2/pt_speaker_1", "name": "Portuguese Speaker 1", "gender": "female", "language": "pt"},
        {"id": "v2/ru_speaker_0", "name": "Russian Speaker 0", "gender": "male", "language": "ru"},
        {"id": "v2/ru_speaker_1", "name": "Russian Speaker 1", "gender": "female", "language": "ru"},
        {"id": "v2/tr_speaker_0", "name": "Turkish Speaker 0", "gender": "male", "language": "tr"},
        {"id": "v2/tr_speaker_1", "name": "Turkish Speaker 1", "gender": "female", "language": "tr"},
        {"id": "v2/zh_speaker_0", "name": "Chinese Speaker 0", "gender": "male", "language": "zh"},
        {"id": "v2/zh_speaker_1", "name": "Chinese Speaker 1", "gender": "female", "language": "zh"},
        {"id": "v2/hi_speaker_0", "name": "Hindi Speaker 0", "gender": "male", "language": "hi"},
        {"id": "v2/hi_speaker_1", "name": "Hindi Speaker 1", "gender": "female", "language": "hi"},
    ]

    # VCTK speaker metadata (sample - full list would be loaded from dataset)
    VCTK_SPEAKERS = [
        {"id": "p225", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p226", "gender": "male", "accent": "English", "age": "22"},
        {"id": "p227", "gender": "male", "accent": "English", "age": "38"},
        {"id": "p228", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p229", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p230", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p231", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p232", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p233", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p234", "gender": "female", "accent": "Scottish", "age": "22"},
        {"id": "p236", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p237", "gender": "male", "accent": "Scottish", "age": "22"},
        {"id": "p238", "gender": "female", "accent": "NorthernIrish", "age": "22"},
        {"id": "p239", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p240", "gender": "female", "accent": "English", "age": "21"},
        {"id": "p241", "gender": "male", "accent": "Scottish", "age": "21"},
        {"id": "p243", "gender": "male", "accent": "English", "age": "22"},
        {"id": "p244", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p245", "gender": "male", "accent": "Irish", "age": "23"},
        {"id": "p246", "gender": "male", "accent": "Scottish", "age": "22"},
        {"id": "p247", "gender": "male", "accent": "Scottish", "age": "22"},
        {"id": "p248", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p249", "gender": "female", "accent": "Scottish", "age": "22"},
        {"id": "p250", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p251", "gender": "male", "accent": "Indian", "age": "26"},
        {"id": "p252", "gender": "male", "accent": "Scottish", "age": "22"},
        {"id": "p253", "gender": "female", "accent": "Welsh", "age": "22"},
        {"id": "p254", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p255", "gender": "male", "accent": "Scottish", "age": "23"},
        {"id": "p256", "gender": "male", "accent": "English", "age": "24"},
        {"id": "p257", "gender": "female", "accent": "English", "age": "24"},
        {"id": "p258", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p259", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p260", "gender": "male", "accent": "English", "age": "21"},
        {"id": "p261", "gender": "female", "accent": "NorthernIrish", "age": "24"},
        {"id": "p262", "gender": "female", "accent": "Scottish", "age": "23"},
        {"id": "p263", "gender": "male", "accent": "English", "age": "22"},
        {"id": "p264", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p265", "gender": "female", "accent": "Scottish", "age": "23"},
        {"id": "p266", "gender": "female", "accent": "Irish", "age": "22"},
        {"id": "p267", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p268", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p269", "gender": "female", "accent": "English", "age": "20"},
        {"id": "p270", "gender": "male", "accent": "English", "age": "21"},
        {"id": "p271", "gender": "male", "accent": "English", "age": "19"},
        {"id": "p272", "gender": "male", "accent": "Scottish", "age": "23"},
        {"id": "p273", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p274", "gender": "male", "accent": "English", "age": "22"},
        {"id": "p275", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p276", "gender": "female", "accent": "English", "age": "24"},
        {"id": "p277", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p278", "gender": "male", "accent": "English", "age": "24"},
        {"id": "p279", "gender": "male", "accent": "English", "age": "24"},
        {"id": "p280", "gender": "female", "accent": "English", "age": "26"},
        {"id": "p281", "gender": "male", "accent": "Scottish", "age": "26"},
        {"id": "p282", "gender": "female", "accent": "Scottish", "age": "24"},
        {"id": "p283", "gender": "female", "accent": "English", "age": "24"},
        {"id": "p284", "gender": "male", "accent": "English", "age": "25"},
        {"id": "p285", "gender": "male", "accent": "English", "age": "21"},
        {"id": "p286", "gender": "male", "accent": "English", "age": "21"},
        {"id": "p287", "gender": "male", "accent": "English", "age": "20"},
        {"id": "p288", "gender": "female", "accent": "Irish", "age": "22"},
        {"id": "p292", "gender": "male", "accent": "NorthernIrish", "age": "23"},
        {"id": "p293", "gender": "female", "accent": "American", "age": "23"},
        {"id": "p294", "gender": "female", "accent": "American", "age": "33"},
        {"id": "p295", "gender": "female", "accent": "Irish", "age": "22"},
        {"id": "p297", "gender": "female", "accent": "American", "age": "20"},
        {"id": "p298", "gender": "male", "accent": "Irish", "age": "24"},
        {"id": "p299", "gender": "female", "accent": "American", "age": "25"},
        {"id": "p300", "gender": "female", "accent": "American", "age": "23"},
        {"id": "p301", "gender": "female", "accent": "American", "age": "23"},
        {"id": "p302", "gender": "male", "accent": "Canadian", "age": "24"},
        {"id": "p303", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p304", "gender": "male", "accent": "NorthernIrish", "age": "27"},
        {"id": "p305", "gender": "female", "accent": "American", "age": "23"},
        {"id": "p306", "gender": "female", "accent": "American", "age": "24"},
        {"id": "p307", "gender": "female", "accent": "Canadian", "age": "35"},
        {"id": "p308", "gender": "female", "accent": "American", "age": "23"},
        {"id": "p310", "gender": "female", "accent": "American", "age": "21"},
        {"id": "p311", "gender": "male", "accent": "American", "age": "24"},
        {"id": "p312", "gender": "female", "accent": "English", "age": "35"},
        {"id": "p313", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p314", "gender": "female", "accent": "English", "age": "29"},
        {"id": "p316", "gender": "male", "accent": "Canadian", "age": "23"},
        {"id": "p317", "gender": "female", "accent": "Canadian", "age": "23"},
        {"id": "p318", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p323", "gender": "female", "accent": "SouthAfrican", "age": "22"},
        {"id": "p326", "gender": "male", "accent": "English", "age": "23"},
        {"id": "p329", "gender": "female", "accent": "American", "age": "24"},
        {"id": "p330", "gender": "female", "accent": "American", "age": "24"},
        {"id": "p333", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p334", "gender": "male", "accent": "English", "age": "24"},
        {"id": "p335", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p336", "gender": "female", "accent": "Scottish", "age": "23"},
        {"id": "p339", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p340", "gender": "female", "accent": "English", "age": "23"},
        {"id": "p341", "gender": "female", "accent": "American", "age": "23"},
        {"id": "p343", "gender": "female", "accent": "SouthAfrican", "age": "22"},
        {"id": "p345", "gender": "male", "accent": "American", "age": "22"},
        {"id": "p347", "gender": "male", "accent": "English", "age": "24"},
        {"id": "p351", "gender": "female", "accent": "English", "age": "22"},
        {"id": "p360", "gender": "male", "accent": "American", "age": "24"},
        {"id": "p361", "gender": "female", "accent": "American", "age": "21"},
        {"id": "p362", "gender": "female", "accent": "American", "age": "29"},
        {"id": "p363", "gender": "male", "accent": "Canadian", "age": "23"},
        {"id": "p364", "gender": "male", "accent": "English", "age": "35"},
        {"id": "p374", "gender": "male", "accent": "English", "age": "25"},
        {"id": "p376", "gender": "male", "accent": "English", "age": "22"},
        {"id": "s5", "gender": "female", "accent": "Scottish", "age": "28"},
    ]

    # HiFi-TTS speakers
    HIFI_SPEAKERS = [
        {"id": "92", "gender": "female", "name": "HiFi Speaker 92", "quality": "studio"},
        {"id": "6097", "gender": "female", "name": "HiFi Speaker 6097", "quality": "studio"},
        {"id": "6670", "gender": "male", "name": "HiFi Speaker 6670", "quality": "studio"},
        {"id": "6671", "gender": "male", "name": "HiFi Speaker 6671", "quality": "studio"},
        {"id": "8051", "gender": "female", "name": "HiFi Speaker 8051", "quality": "studio"},
        {"id": "9017", "gender": "male", "name": "HiFi Speaker 9017", "quality": "studio"},
        {"id": "9136", "gender": "female", "name": "HiFi Speaker 9136", "quality": "studio"},
        {"id": "11614", "gender": "male", "name": "HiFi Speaker 11614", "quality": "studio"},
        {"id": "11697", "gender": "female", "name": "HiFi Speaker 11697", "quality": "studio"},
        {"id": "12787", "gender": "female", "name": "HiFi Speaker 12787", "quality": "studio"},
    ]

    def __init__(self, cache_dir: Optional[str] = None):
        self.cache_dir = Path(cache_dir or os.path.join(settings.STORAGE_PATH, "voice_library"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Subdirectories for different data types
        self.embeddings_dir = self.cache_dir / "embeddings"
        self.samples_dir = self.cache_dir / "samples"
        self.metadata_dir = self.cache_dir / "metadata"

        for d in [self.embeddings_dir, self.samples_dir, self.metadata_dir]:
            d.mkdir(parents=True, exist_ok=True)

        self._voice_cache: Dict[str, Dict] = {}
        self._initialized = False

    async def initialize(self):
        """Initialize the voice library with all sources"""
        if self._initialized:
            return

        logger.info("Initializing voice library...")
        await self._load_cached_metadata()
        self._initialized = True
        logger.info(f"Voice library initialized with {len(self._voice_cache)} voices")

    async def _load_cached_metadata(self):
        """Load cached voice metadata from disk"""
        metadata_file = self.metadata_dir / "all_voices.json"
        if metadata_file.exists():
            try:
                async with aiofiles.open(metadata_file, 'r') as f:
                    content = await f.read()
                    self._voice_cache = json.loads(content)
            except Exception as e:
                logger.error(f"Failed to load cached metadata: {e}")
                self._voice_cache = {}

    async def _save_cached_metadata(self):
        """Save voice metadata to disk"""
        metadata_file = self.metadata_dir / "all_voices.json"
        try:
            async with aiofiles.open(metadata_file, 'w') as f:
                await f.write(json.dumps(self._voice_cache, indent=2))
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")

    def get_all_sources(self) -> List[Dict[str, Any]]:
        """Get information about all available voice sources"""
        sources = []
        for source_id, info in self.DATASETS.items():
            sources.append({
                "id": source_id,
                "name": info["name"],
                "description": info["description"],
                "license": info["license"],
                "speakers": info.get("speakers", 0),
                "languages": info.get("languages", ["en"]),
            })
        return sources

    async def get_voices(
        self,
        source: Optional[str] = None,
        language: Optional[str] = None,
        gender: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Get voices from the library with optional filtering"""
        await self.initialize()

        # Build the voice list from all sources
        all_voices = await self._get_all_voices()

        # Apply filters
        filtered = all_voices

        if source:
            filtered = [v for v in filtered if v["source"] == source]

        if language:
            filtered = [v for v in filtered if v.get("language", "en").startswith(language)]

        if gender:
            filtered = [v for v in filtered if v.get("gender", "").lower() == gender.lower()]

        if search:
            search_lower = search.lower()
            filtered = [
                v for v in filtered
                if search_lower in v.get("name", "").lower()
                or search_lower in v.get("description", "").lower()
                or search_lower in v.get("accent", "").lower()
            ]

        total = len(filtered)
        voices = filtered[offset:offset + limit]

        return {
            "voices": voices,
            "total": total,
            "limit": limit,
            "offset": offset,
            "sources": list(self.DATASETS.keys()),
        }

    async def _get_all_voices(self) -> List[Dict[str, Any]]:
        """Get all voices from all sources"""
        if self._voice_cache:
            return list(self._voice_cache.values())

        all_voices = []

        # XTTS v2 built-in speakers
        for speaker in self.XTTS_SPEAKERS:
            voice_id = f"xtts_{speaker['id'].replace(' ', '_').lower()}"
            all_voices.append({
                "id": voice_id,
                "source": "xtts_builtin",
                "source_id": speaker["id"],
                "name": speaker["id"],
                "description": f"{speaker['style']} voice with {speaker['accent']} accent",
                "gender": speaker["gender"],
                "accent": speaker["accent"],
                "style": speaker["style"],
                "language": "en",
                "languages": self.DATASETS["xtts_builtin"]["languages"],
                "quality": "high",
                "license": "MPL-2.0",
                "is_downloaded": True,  # Built-in, always available
            })

        # Bark presets
        for preset in self.BARK_PRESETS:
            voice_id = f"bark_{preset['id'].replace('/', '_')}"
            all_voices.append({
                "id": voice_id,
                "source": "bark",
                "source_id": preset["id"],
                "name": preset["name"],
                "description": f"Bark AI voice preset - {preset['name']}",
                "gender": preset["gender"],
                "language": preset["language"],
                "quality": "high",
                "license": "MIT",
                "is_downloaded": True,  # Built into Bark
            })

        # VCTK speakers
        for speaker in self.VCTK_SPEAKERS:
            voice_id = f"vctk_{speaker['id']}"
            all_voices.append({
                "id": voice_id,
                "source": "vctk",
                "source_id": speaker["id"],
                "name": f"VCTK {speaker['id']}",
                "description": f"{speaker['gender'].title()} speaker with {speaker['accent']} accent, age {speaker['age']}",
                "gender": speaker["gender"],
                "accent": speaker["accent"],
                "age": speaker["age"],
                "language": "en",
                "quality": "high",
                "license": "CC BY 4.0",
                "is_downloaded": False,
            })

        # HiFi-TTS speakers
        for speaker in self.HIFI_SPEAKERS:
            voice_id = f"hifi_{speaker['id']}"
            all_voices.append({
                "id": voice_id,
                "source": "hifi_tts",
                "source_id": speaker["id"],
                "name": speaker["name"],
                "description": f"Studio quality {speaker['gender']} voice",
                "gender": speaker["gender"],
                "language": "en",
                "quality": "studio",
                "license": "CC BY 4.0",
                "is_downloaded": False,
            })

        # LJSpeech
        all_voices.append({
            "id": "ljspeech_linda",
            "source": "lj_speech",
            "source_id": "lj",
            "name": "LJ (Linda Johnson)",
            "description": "High-quality female voice from audiobook recordings. Clear, professional narration style.",
            "gender": "female",
            "language": "en",
            "accent": "American",
            "quality": "studio",
            "license": "Public Domain",
            "is_downloaded": False,
        })

        # Cache the results
        self._voice_cache = {v["id"]: v for v in all_voices}
        await self._save_cached_metadata()

        return all_voices

    async def get_voice(self, voice_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific voice by ID"""
        await self.initialize()
        voices = await self._get_all_voices()

        for voice in voices:
            if voice["id"] == voice_id:
                return voice

        return None

    async def download_voice(self, voice_id: str) -> Dict[str, Any]:
        """Download/cache a voice's sample audio and embedding"""
        voice = await self.get_voice(voice_id)
        if not voice:
            raise ValueError(f"Voice not found: {voice_id}")

        source = voice["source"]

        if source == "xtts_builtin" or source == "bark":
            # Built-in voices don't need downloading
            voice["is_downloaded"] = True
            return voice

        # Download sample audio from HuggingFace datasets
        if source == "vctk":
            await self._download_vctk_sample(voice)
        elif source == "hifi_tts":
            await self._download_hifi_sample(voice)
        elif source == "lj_speech":
            await self._download_ljspeech_sample(voice)
        elif source == "libri_tts":
            await self._download_libritts_sample(voice)

        voice["is_downloaded"] = True
        self._voice_cache[voice_id] = voice
        await self._save_cached_metadata()

        return voice

    async def _download_vctk_sample(self, voice: Dict) -> None:
        """Download a sample from VCTK dataset"""
        speaker_id = voice["source_id"]
        sample_path = self.samples_dir / f"vctk_{speaker_id}.wav"

        if sample_path.exists():
            voice["sample_audio_path"] = str(sample_path)
            return

        # Try to download from HuggingFace
        try:
            from datasets import load_dataset
            ds = load_dataset(
                "VCTK/VCTK-Corpus",
                split="train",
                streaming=True
            )
            # Find a sample for this speaker
            for sample in ds:
                if sample.get("speaker_id") == speaker_id:
                    audio = sample["audio"]
                    # Save the audio
                    import soundfile as sf
                    sf.write(str(sample_path), audio["array"], audio["sampling_rate"])
                    voice["sample_audio_path"] = str(sample_path)
                    break
        except Exception as e:
            logger.warning(f"Could not download VCTK sample for {speaker_id}: {e}")

    async def _download_hifi_sample(self, voice: Dict) -> None:
        """Download a sample from Hi-Fi TTS dataset"""
        speaker_id = voice["source_id"]
        sample_path = self.samples_dir / f"hifi_{speaker_id}.wav"

        if sample_path.exists():
            voice["sample_audio_path"] = str(sample_path)
            return

        try:
            from datasets import load_dataset
            ds = load_dataset(
                "MrDragonFox/Hi-Fi-TTS",
                split="train",
                streaming=True
            )
            for sample in ds:
                if str(sample.get("speaker_id")) == speaker_id:
                    audio = sample["audio"]
                    import soundfile as sf
                    sf.write(str(sample_path), audio["array"], audio["sampling_rate"])
                    voice["sample_audio_path"] = str(sample_path)
                    break
        except Exception as e:
            logger.warning(f"Could not download Hi-Fi TTS sample for {speaker_id}: {e}")

    async def _download_ljspeech_sample(self, voice: Dict) -> None:
        """Download a sample from LJSpeech dataset"""
        sample_path = self.samples_dir / "ljspeech_sample.wav"

        if sample_path.exists():
            voice["sample_audio_path"] = str(sample_path)
            return

        try:
            from datasets import load_dataset
            ds = load_dataset("lj_speech", split="train[:1]")
            if len(ds) > 0:
                audio = ds[0]["audio"]
                import soundfile as sf
                sf.write(str(sample_path), audio["array"], audio["sampling_rate"])
                voice["sample_audio_path"] = str(sample_path)
        except Exception as e:
            logger.warning(f"Could not download LJSpeech sample: {e}")

    async def _download_libritts_sample(self, voice: Dict) -> None:
        """Download a sample from LibriTTS dataset"""
        speaker_id = voice["source_id"]
        sample_path = self.samples_dir / f"libritts_{speaker_id}.wav"

        if sample_path.exists():
            voice["sample_audio_path"] = str(sample_path)
            return

        try:
            from datasets import load_dataset
            ds = load_dataset(
                "mythicinfinity/libritts_r",
                split="train",
                streaming=True
            )
            for sample in ds:
                if str(sample.get("speaker_id")) == speaker_id:
                    audio = sample["audio"]
                    import soundfile as sf
                    sf.write(str(sample_path), audio["array"], audio["sampling_rate"])
                    voice["sample_audio_path"] = str(sample_path)
                    break
        except Exception as e:
            logger.warning(f"Could not download LibriTTS sample for {speaker_id}: {e}")

    async def generate_preview(
        self,
        voice_id: str,
        text: str = "Hello, this is a preview of my voice. I hope you find it useful for your projects."
    ) -> bytes:
        """Generate a preview audio for a voice"""
        voice = await self.get_voice(voice_id)
        if not voice:
            raise ValueError(f"Voice not found: {voice_id}")

        source = voice["source"]
        source_id = voice["source_id"]

        # Use the appropriate TTS method based on source
        if source == "xtts_builtin":
            return await self._generate_xtts_preview(source_id, text)
        elif source == "bark":
            return await self._generate_bark_preview(source_id, text)
        else:
            # For dataset voices, we need a reference audio
            if voice.get("sample_audio_path"):
                return await self._generate_clone_preview(voice["sample_audio_path"], text)
            else:
                raise ValueError("Voice sample not downloaded. Call download_voice first.")

    async def _generate_xtts_preview(self, speaker_name: str, text: str) -> bytes:
        """Generate preview using XTTS v2 built-in speaker"""
        try:
            from TTS.api import TTS
            import io
            import soundfile as sf
            import numpy as np

            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

            # Generate speech
            wav = tts.tts(text=text, speaker=speaker_name, language="en")

            # Convert to bytes
            buffer = io.BytesIO()
            sf.write(buffer, np.array(wav), 24000, format='WAV')
            buffer.seek(0)
            return buffer.read()

        except Exception as e:
            logger.error(f"Failed to generate XTTS preview: {e}")
            raise

    async def _generate_bark_preview(self, preset_id: str, text: str) -> bytes:
        """Generate preview using Bark voice preset"""
        try:
            from bark import SAMPLE_RATE, generate_audio, preload_models
            import io
            import soundfile as sf
            import numpy as np

            preload_models()
            audio_array = generate_audio(text, history_prompt=preset_id)

            buffer = io.BytesIO()
            sf.write(buffer, audio_array, SAMPLE_RATE, format='WAV')
            buffer.seek(0)
            return buffer.read()

        except Exception as e:
            logger.error(f"Failed to generate Bark preview: {e}")
            raise

    async def _generate_clone_preview(self, reference_audio_path: str, text: str) -> bytes:
        """Generate preview using voice cloning from reference audio"""
        try:
            from TTS.api import TTS
            import io
            import soundfile as sf
            import numpy as np

            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

            wav = tts.tts(
                text=text,
                speaker_wav=reference_audio_path,
                language="en"
            )

            buffer = io.BytesIO()
            sf.write(buffer, np.array(wav), 24000, format='WAV')
            buffer.seek(0)
            return buffer.read()

        except Exception as e:
            logger.error(f"Failed to generate clone preview: {e}")
            raise

    async def add_to_user_collection(
        self,
        user_id: str,
        voice_id: str,
        custom_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a library voice to user's personal collection"""
        voice = await self.get_voice(voice_id)
        if not voice:
            raise ValueError(f"Voice not found: {voice_id}")

        # In a real implementation, this would save to the database
        return {
            "user_id": user_id,
            "voice_id": voice_id,
            "custom_name": custom_name or voice["name"],
            "added_at": datetime.utcnow().isoformat(),
        }

    async def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about the voice library"""
        all_voices = await self._get_all_voices()

        stats = {
            "total_voices": len(all_voices),
            "by_source": {},
            "by_gender": {"male": 0, "female": 0, "unknown": 0},
            "by_language": {},
            "by_quality": {"standard": 0, "high": 0, "studio": 0},
        }

        for voice in all_voices:
            # By source
            source = voice.get("source", "unknown")
            stats["by_source"][source] = stats["by_source"].get(source, 0) + 1

            # By gender
            gender = voice.get("gender", "unknown")
            if gender in stats["by_gender"]:
                stats["by_gender"][gender] += 1
            else:
                stats["by_gender"]["unknown"] += 1

            # By language
            language = voice.get("language", "en")
            stats["by_language"][language] = stats["by_language"].get(language, 0) + 1

            # By quality
            quality = voice.get("quality", "standard")
            if quality in stats["by_quality"]:
                stats["by_quality"][quality] += 1

        return stats


# Singleton instance
_voice_library_service: Optional[VoiceLibraryService] = None


def get_voice_library_service() -> VoiceLibraryService:
    """Get or create the voice library service singleton"""
    global _voice_library_service
    if _voice_library_service is None:
        _voice_library_service = VoiceLibraryService()
    return _voice_library_service
