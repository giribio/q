# Student guide

## Before Week 1
1. Install Python 3.10 or later.
2. Create a virtual environment.
3. Install packages from `requirements.txt`.
4. Install JupyterLab.
5. Install Visual Studio Code and the current Microsoft QDK extension for Q#.
6. Download the course repository and run the setup notebook.

## Python setup
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
jupyter lab
```

## Learning workflow
For each week: watch the lecture segments, read the notes, run the notebook from a clean kernel, complete the quiz, submit the assignment and record questions in the course forum.

## Responsible scientific practice
Keep random seeds, record package versions, cite sources, include a classical baseline and describe limitations. Never describe a simulator demonstration as proof of practical quantum advantage.
