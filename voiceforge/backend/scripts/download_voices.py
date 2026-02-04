#!/usr/bin/env python3
"""
Voice Library Downloader
Downloads and caches voices from free open source datasets

Supported datasets:
- VCTK Corpus (110 speakers)
- Hi-Fi TTS (10 studio quality speakers)
- LJSpeech (1 high-quality female speaker)
- LibriTTS (subset of popular speakers)
- Common Voice (sample of diverse speakers)
- SpeechT5 speaker embeddings

Usage:
    python download_voices.py --all                    # Download all datasets
    python download_voices.py --dataset vctk          # Download specific dataset
    python download_voices.py --dataset vctk hifi     # Download multiple datasets
    python download_voices.py --list                  # List available datasets
    python download_voices.py --status                # Show download status
"""

import os
import sys
import json
import asyncio
import argparse
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Any
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import required packages
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    logger.warning("tqdm not installed. Progress bars will be simplified.")

try:
    from datasets import load_dataset
    HAS_DATASETS = True
except ImportError:
    HAS_DATASETS = False
    logger.warning("datasets library not installed. Some downloads will be unavailable.")

try:
    import soundfile as sf
    HAS_SOUNDFILE = True
except ImportError:
    HAS_SOUNDFILE = False
    logger.warning("soundfile not installed. Audio saving will be unavailable.")

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    logger.warning("requests not installed. Direct downloads will be unavailable.")


# Configuration
DEFAULT_CACHE_DIR = os.environ.get(
    'VOICE_LIBRARY_CACHE',
    os.path.join(os.path.dirname(__file__), '..', 'storage', 'voice_library')
)

DATASETS_CONFIG = {
    'vctk': {
        'name': 'VCTK Corpus',
        'hf_dataset': 'edinburghcstr/vctk',
        'split': 'train',
        'description': '110 English speakers with various accents',
        'license': 'CC BY 4.0',
        'speakers': 110,
        'samples_per_speaker': 5,
        'audio_column': 'audio',
        'speaker_column': 'speaker_id',
        'text_column': 'text',
    },
    'hifi_tts': {
        'name': 'Hi-Fi TTS',
        'hf_dataset': 'reach-vb/hi-fi-tts-v0',
        'split': 'train',
        'description': '10 studio quality speakers',
        'license': 'CC BY 4.0',
        'speakers': 10,
        'samples_per_speaker': 10,
        'audio_column': 'audio',
        'speaker_column': 'speaker_id',
        'text_column': 'text_normalized',
    },
    'ljspeech': {
        'name': 'LJSpeech',
        'hf_dataset': 'keithito/lj_speech',
        'split': 'train',
        'description': 'High-quality single female speaker',
        'license': 'Public Domain',
        'speakers': 1,
        'samples_per_speaker': 20,
        'audio_column': 'audio',
        'speaker_column': None,
        'text_column': 'text',
    },
    'libritts': {
        'name': 'LibriTTS',
        'hf_dataset': 'cdminix/libritts-r-aligned',
        'split': 'train.clean.100',
        'description': 'Large corpus of English audiobook speakers',
        'license': 'CC BY 4.0',
        'speakers': 100,  # We'll sample 100 popular speakers
        'samples_per_speaker': 5,
        'audio_column': 'audio',
        'speaker_column': 'speaker_id',
        'text_column': 'text',
    },
    'common_voice': {
        'name': 'Common Voice',
        'hf_dataset': 'mozilla-foundation/common_voice_16_1',
        'config': 'en',
        'split': 'train',
        'description': 'Crowdsourced multilingual dataset',
        'license': 'CC0',
        'speakers': 50,  # Sample 50 speakers
        'samples_per_speaker': 5,
        'audio_column': 'audio',
        'speaker_column': 'client_id',
        'text_column': 'sentence',
    },
    'speecht5': {
        'name': 'SpeechT5 Embeddings',
        'hf_dataset': 'Matthijs/cmu-arctic-xvectors',
        'split': 'validation',
        'description': 'Pre-computed speaker embeddings',
        'license': 'MIT',
        'speakers': 7930,
        'type': 'embeddings',
    },
}


class VoiceDownloader:
    """Downloads and manages voice samples from various datasets"""

    def __init__(self, cache_dir: str = DEFAULT_CACHE_DIR):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Subdirectories
        self.samples_dir = self.cache_dir / 'samples'
        self.embeddings_dir = self.cache_dir / 'embeddings'
        self.metadata_dir = self.cache_dir / 'metadata'

        for d in [self.samples_dir, self.embeddings_dir, self.metadata_dir]:
            d.mkdir(parents=True, exist_ok=True)

        self.status_file = self.metadata_dir / 'download_status.json'
        self.status = self._load_status()

    def _load_status(self) -> Dict:
        """Load download status from file"""
        if self.status_file.exists():
            try:
                with open(self.status_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {'datasets': {}, 'last_updated': None}

    def _save_status(self):
        """Save download status to file"""
        self.status['last_updated'] = datetime.now().isoformat()
        with open(self.status_file, 'w') as f:
            json.dump(self.status, f, indent=2)

    def list_datasets(self):
        """List all available datasets"""
        print("\n" + "=" * 60)
        print("Available Voice Datasets")
        print("=" * 60 + "\n")

        for ds_id, config in DATASETS_CONFIG.items():
            status = self.status.get('datasets', {}).get(ds_id, {})
            downloaded = status.get('completed', False)
            status_str = "✓ Downloaded" if downloaded else "○ Not downloaded"

            print(f"  {ds_id}")
            print(f"    Name: {config['name']}")
            print(f"    Description: {config['description']}")
            print(f"    Speakers: {config['speakers']}")
            print(f"    License: {config['license']}")
            print(f"    Status: {status_str}")
            if downloaded:
                print(f"    Downloaded: {status.get('samples_count', 0)} samples")
            print()

    def show_status(self):
        """Show detailed download status"""
        print("\n" + "=" * 60)
        print("Voice Library Download Status")
        print("=" * 60 + "\n")

        total_samples = 0
        total_size = 0

        for ds_id, config in DATASETS_CONFIG.items():
            status = self.status.get('datasets', {}).get(ds_id, {})
            downloaded = status.get('completed', False)

            if downloaded:
                samples = status.get('samples_count', 0)
                size_mb = status.get('size_mb', 0)
                total_samples += samples
                total_size += size_mb

                print(f"  ✓ {config['name']}")
                print(f"    Samples: {samples}")
                print(f"    Size: {size_mb:.1f} MB")
                print(f"    Downloaded: {status.get('downloaded_at', 'Unknown')}")
            else:
                print(f"  ○ {config['name']} - Not downloaded")
            print()

        print("-" * 60)
        print(f"  Total samples: {total_samples}")
        print(f"  Total size: {total_size:.1f} MB")
        print(f"  Cache directory: {self.cache_dir}")
        print()

    def download_dataset(self, dataset_id: str, force: bool = False) -> bool:
        """Download a specific dataset"""
        if dataset_id not in DATASETS_CONFIG:
            logger.error(f"Unknown dataset: {dataset_id}")
            return False

        config = DATASETS_CONFIG[dataset_id]

        # Check if already downloaded
        if not force and self.status.get('datasets', {}).get(dataset_id, {}).get('completed'):
            logger.info(f"{config['name']} already downloaded. Use --force to re-download.")
            return True

        logger.info(f"Downloading {config['name']}...")

        if not HAS_DATASETS:
            logger.error("datasets library required. Install with: pip install datasets")
            return False

        try:
            if config.get('type') == 'embeddings':
                return self._download_embeddings(dataset_id, config)
            else:
                return self._download_audio_samples(dataset_id, config)
        except Exception as e:
            logger.error(f"Failed to download {config['name']}: {e}")
            return False

    def _download_audio_samples(self, dataset_id: str, config: Dict) -> bool:
        """Download audio samples from a HuggingFace dataset"""
        if not HAS_SOUNDFILE:
            logger.error("soundfile required. Install with: pip install soundfile")
            return False

        # Create dataset directory
        ds_dir = self.samples_dir / dataset_id
        ds_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Load dataset
            logger.info(f"Loading dataset from HuggingFace: {config['hf_dataset']}")

            load_kwargs = {
                'path': config['hf_dataset'],
                'split': config['split'],
                'streaming': True,
                'trust_remote_code': True,
            }

            if 'config' in config:
                load_kwargs['name'] = config['config']

            dataset = load_dataset(**load_kwargs)

            # Track speakers and samples
            speaker_samples: Dict[str, List] = {}
            samples_per_speaker = config.get('samples_per_speaker', 5)
            max_speakers = config.get('speakers', 100)

            # Progress tracking
            total_samples = 0
            total_size = 0

            logger.info(f"Downloading up to {samples_per_speaker} samples for {max_speakers} speakers...")

            iterator = tqdm(dataset, desc=f"Downloading {config['name']}") if HAS_TQDM else dataset

            for sample in iterator:
                # Get speaker ID
                speaker_col = config.get('speaker_column')
                if speaker_col:
                    speaker_id = str(sample.get(speaker_col, 'default'))
                else:
                    speaker_id = 'default'

                # Check if we have enough samples for this speaker
                if speaker_id not in speaker_samples:
                    if len(speaker_samples) >= max_speakers:
                        continue
                    speaker_samples[speaker_id] = []

                if len(speaker_samples[speaker_id]) >= samples_per_speaker:
                    # Check if we have enough for all speakers
                    if all(len(s) >= samples_per_speaker for s in speaker_samples.values()):
                        if len(speaker_samples) >= max_speakers:
                            break
                    continue

                # Get audio data
                audio = sample.get(config['audio_column'])
                if audio is None:
                    continue

                # Handle different audio formats
                if isinstance(audio, dict):
                    audio_array = audio.get('array')
                    sample_rate = audio.get('sampling_rate', 16000)
                else:
                    continue

                if audio_array is None:
                    continue

                # Save audio file
                sample_idx = len(speaker_samples[speaker_id])
                filename = f"{dataset_id}_{speaker_id}_{sample_idx}.wav"
                filepath = ds_dir / filename

                try:
                    if HAS_NUMPY:
                        audio_array = np.array(audio_array)
                    sf.write(str(filepath), audio_array, sample_rate)

                    # Get file size
                    file_size = filepath.stat().st_size / (1024 * 1024)  # MB
                    total_size += file_size
                    total_samples += 1

                    # Save metadata
                    speaker_samples[speaker_id].append({
                        'filename': filename,
                        'speaker_id': speaker_id,
                        'text': sample.get(config.get('text_column', 'text'), ''),
                        'sample_rate': sample_rate,
                        'size_mb': file_size,
                    })

                except Exception as e:
                    logger.warning(f"Failed to save sample: {e}")
                    continue

            # Save metadata
            metadata = {
                'dataset_id': dataset_id,
                'name': config['name'],
                'speakers': list(speaker_samples.keys()),
                'samples': speaker_samples,
                'total_samples': total_samples,
                'total_size_mb': total_size,
                'downloaded_at': datetime.now().isoformat(),
            }

            metadata_file = self.metadata_dir / f"{dataset_id}_metadata.json"
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)

            # Update status
            if 'datasets' not in self.status:
                self.status['datasets'] = {}

            self.status['datasets'][dataset_id] = {
                'completed': True,
                'samples_count': total_samples,
                'speakers_count': len(speaker_samples),
                'size_mb': total_size,
                'downloaded_at': datetime.now().isoformat(),
            }
            self._save_status()

            logger.info(f"Downloaded {total_samples} samples from {len(speaker_samples)} speakers ({total_size:.1f} MB)")
            return True

        except Exception as e:
            logger.error(f"Error downloading dataset: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _download_embeddings(self, dataset_id: str, config: Dict) -> bool:
        """Download pre-computed speaker embeddings"""
        emb_dir = self.embeddings_dir / dataset_id
        emb_dir.mkdir(parents=True, exist_ok=True)

        try:
            logger.info(f"Loading embeddings from HuggingFace: {config['hf_dataset']}")

            dataset = load_dataset(
                config['hf_dataset'],
                split=config['split'],
                trust_remote_code=True,
            )

            total_embeddings = 0

            iterator = tqdm(dataset, desc="Downloading embeddings") if HAS_TQDM else dataset

            for i, sample in enumerate(iterator):
                # Get embedding
                embedding = sample.get('xvector')
                if embedding is None:
                    continue

                # Save embedding
                filename = f"speaker_{i:06d}.npy"
                filepath = emb_dir / filename

                if HAS_NUMPY:
                    np.save(str(filepath), np.array(embedding))
                    total_embeddings += 1

            # Update status
            if 'datasets' not in self.status:
                self.status['datasets'] = {}

            self.status['datasets'][dataset_id] = {
                'completed': True,
                'embeddings_count': total_embeddings,
                'downloaded_at': datetime.now().isoformat(),
            }
            self._save_status()

            logger.info(f"Downloaded {total_embeddings} speaker embeddings")
            return True

        except Exception as e:
            logger.error(f"Error downloading embeddings: {e}")
            return False

    def download_all(self, force: bool = False):
        """Download all datasets"""
        results = {}
        for dataset_id in DATASETS_CONFIG.keys():
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing: {DATASETS_CONFIG[dataset_id]['name']}")
            logger.info(f"{'='*60}")
            results[dataset_id] = self.download_dataset(dataset_id, force=force)

        # Summary
        print("\n" + "=" * 60)
        print("Download Summary")
        print("=" * 60)
        for ds_id, success in results.items():
            status = "✓ Success" if success else "✗ Failed"
            print(f"  {DATASETS_CONFIG[ds_id]['name']}: {status}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description='Download voice samples from free open source datasets',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s --all                    Download all datasets
    %(prog)s --dataset vctk           Download VCTK corpus
    %(prog)s --dataset vctk hifi_tts  Download multiple datasets
    %(prog)s --list                   List available datasets
    %(prog)s --status                 Show download status
    %(prog)s --all --force            Re-download everything

Datasets:
    vctk         - VCTK Corpus (110 English speakers with accents)
    hifi_tts     - Hi-Fi TTS (10 studio quality speakers)
    ljspeech     - LJSpeech (1 high-quality female speaker)
    libritts     - LibriTTS (Large English audiobook corpus)
    common_voice - Mozilla Common Voice (Crowdsourced multilingual)
    speecht5     - SpeechT5 speaker embeddings
        """
    )

    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Download all datasets'
    )
    parser.add_argument(
        '--dataset', '-d',
        nargs='+',
        choices=list(DATASETS_CONFIG.keys()),
        help='Specific dataset(s) to download'
    )
    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='List available datasets'
    )
    parser.add_argument(
        '--status', '-s',
        action='store_true',
        help='Show download status'
    )
    parser.add_argument(
        '--force', '-f',
        action='store_true',
        help='Force re-download even if already downloaded'
    )
    parser.add_argument(
        '--cache-dir', '-c',
        default=DEFAULT_CACHE_DIR,
        help=f'Cache directory (default: {DEFAULT_CACHE_DIR})'
    )

    args = parser.parse_args()

    # Check for required packages
    missing_packages = []
    if not HAS_DATASETS:
        missing_packages.append('datasets')
    if not HAS_SOUNDFILE:
        missing_packages.append('soundfile')
    if not HAS_NUMPY:
        missing_packages.append('numpy')

    if missing_packages and (args.all or args.dataset):
        print("\nMissing required packages. Install with:")
        print(f"  pip install {' '.join(missing_packages)}")
        print()
        if not HAS_TQDM:
            print("Optional: pip install tqdm  # for progress bars")
        print()

    downloader = VoiceDownloader(cache_dir=args.cache_dir)

    if args.list:
        downloader.list_datasets()
    elif args.status:
        downloader.show_status()
    elif args.all:
        downloader.download_all(force=args.force)
    elif args.dataset:
        for ds_id in args.dataset:
            downloader.download_dataset(ds_id, force=args.force)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
