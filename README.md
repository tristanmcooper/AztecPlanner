# AztecPlanner
ACM SDSU Innovate 4 Hackathon Project 2025


Conda setup:

```
conda create -n aztecPlanner python=3.10
conda activate aztecPlanner
pip install -r requirements.txt
```

## To run the website + backend

In one terminal
```
python -m py_compile utils/api_server.py
python -m uvicorn utils.api_server:app --reload --host 127.0.0.1 --port 8000
```
In another terminal
```
cd front-end-webserver
npm install
npm run dev
```