# -*- coding: utf-8 -*-
"""Ancien nom : lot 2 seulement. Voir tools/planche_lot.py."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from planche_lot import main  # noqa: E402,F401

if __name__ == "__main__":
    main(2)
