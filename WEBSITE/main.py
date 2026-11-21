from flask import Flask, render_template, request, url_for, jsonify, redirect
import smtplib
import sqlite3
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__, template_folder='templates')
app.secret_key = 'secret'

conn = sqlite3.connect('tickets.db')
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no TEXT,
    name TEXT,
    contact TEXT,
    email TEXT,
    address TEXT,
    incident TEXT
)
""")
conn.commit()
conn.close()


@app.route('/', methods=['GET','POST'])
def submit():
    if request.method == 'POST':
        
        sender = os.getenv("EMAIL_SENDER")
        password = os.getenv("EMAIL_PASSWORD")
        receiver = os.getenv("EMAIL_RECEIVER")

        person = request.form["name"]
        phone = request.form["contact"]
        email = request.form["email"]
        address = request.form["address"]
        incident = request.form["incident"]

        conn = sqlite3.connect('tickets.db')
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM tickets")
        count = cursor.fetchone()[0] + 1
        subject = f'#CSR-{count:09d}'

        cursor.execute("""
        INSERT INTO tickets
        (ticket_no, name, contact, email, address, incident)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (subject, person, phone, email, address, incident))

        conn.commit()
        conn.close()


        message = f'Subject: {subject}\n\n Name: {person}\n Mobile No.: {phone}\n Email: {email}\n Address: {address}\n\n Details:\n {incident}'

        print('A')
        server = smtplib.SMTP("smtp.gmail.com", 587)
        print('B')
        server.starttls()
        print('C')
        server.login(sender, password)
        print('D')
        server.sendmail(sender, receiver, message)
        print('E')
        server.quit()

        return render_template('Thankyou.html')
    return render_template('main.html')

@app.route('/form')
def form():
    return render_template('main.html')


@app.route('/hotlines')
def hotlines():
    return render_template('Hotlines.html')

DB_PATH = 'tickets.db'


def fetch_tickets():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT ticket_no, name, contact, email, address, incident
    FROM tickets
    """)

    rows = [dict(row) for row in cursor.fetchall()]
    print(rows)
    conn.close()
    return rows


@app.route('/sign')
def sign():
    return render_template('login.html')


@app.route("/login", methods=['POST'])
def login():
    username = request.form['user']
    password = request.form['pass']

    if username == 'admin' and password == 'admin2026':
        return redirect(url_for('admin'))
    else:
        return 'Invalid credentials'
    

#ADMIN
@app.route('/admin')
def admin():
    tickets = fetch_tickets()
    return render_template('admin.html', tickets=tickets)

@app.route('/trackrequest')
def trackrequest():
    tickets = fetch_tickets()
    return render_template('trackrequest.html', tickets=tickets)

@app.route('/api/tickets')
def api_tickets():
    return jsonify(tickets=fetch_tickets())

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=5001, debug=True)
