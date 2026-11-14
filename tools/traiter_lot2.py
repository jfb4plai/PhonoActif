# -*- coding: utf-8 -*-
"""Ancien nom : lot 2 par défaut. Voir tools/traiter_lot.py (option --lot)."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from traiter_lot import traiter  # noqa: E402,F401

if __name__ == "__main__":
    args = sys.argv[1:]
    traiter(args[0] if args else None, args[1] if len(args) > 1 else None, 2)
