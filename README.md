# Hisab Kitab

Voice-first billing and stock web app for small shopkeepers.

## Run Steps

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Seed the database:
   ```bash
   python seed.py
   ```
5. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

## Branches

- **main**: always working
- **voice**: speech to text, parsing, spoken replies
- **backend**: API, database, logic
- **frontend**: UI
- **testing**: test set, accuracy, pitch assets
