const ticketsBody = document.getElementById('tickets-body');
const syncStatus = document.getElementById('sync-status');
const STATUS_OPTIONS = ['Evaluation', 'Processing', 'Completed'];

let isUpdatingStatus = false;

function syncRowContent(tr, ticket) {
    const ticketKey = String(ticket.ticket_no);
    tr.dataset.ticketNo = ticketKey;

    const fields = [
        ticket.ticket_no,
        ticket.name,
        ticket.contact,
        ticket.email,
        ticket.address,
        ticket.incident
    ];

    let cells = tr.querySelectorAll('td');
    if (cells.length < 7) {
        tr.replaceChildren();
        for (let i = 0; i < 7; i++) {
            tr.appendChild(document.createElement('td'));
        }
        cells = tr.querySelectorAll('td');
    }

    fields.forEach((value, idx) => {
        const text = value ?? '';
        if (cells[idx].textContent !== String(text)) {
            cells[idx].textContent = text;
        }
    });

    const statusTd = cells[6];
    let checkboxes = statusTd.querySelectorAll('.status-checkbox');
    if (checkboxes.length !== STATUS_OPTIONS.length) {
        statusTd.replaceChildren();
        STATUS_OPTIONS.forEach((status) => {
            const label = document.createElement('label');
            label.style.marginRight = '8px';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'status-checkbox';
            cb.value = status;

            label.appendChild(cb);
            label.appendChild(document.createTextNode(` ${status}`));
            statusTd.appendChild(label);
        });
        checkboxes = statusTd.querySelectorAll('.status-checkbox');
    }

    checkboxes.forEach((cb) => {
        cb.checked = ticket.status === cb.value;
    });
}

async function fetchTickets() {
    if (!ticketsBody || isUpdatingStatus) return;

    try {
        const response = await fetch('/api/tickets', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const tickets = await response.json();
        const existingRows = new Map(
            Array.from(ticketsBody.querySelectorAll('tr')).map((row) => [row.dataset.ticketNo, row])
        );
        const seenKeys = new Set();

        tickets.forEach((ticket, index) => {
            const key = String(ticket.ticket_no);
            seenKeys.add(key);

            let row = existingRows.get(key);
            if (!row) {
                row = document.createElement('tr');
            }
            syncRowContent(row, ticket);

            const currentAtPos = ticketsBody.children[index];
            if (currentAtPos !== row) {
                ticketsBody.insertBefore(row, currentAtPos || null);
            }
        });

        existingRows.forEach((row, key) => {
            if (!seenKeys.has(key)) row.remove();
        });

        if (syncStatus) {
            syncStatus.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    } catch (err) {
        console.error('Error fetching tickets:', err);
        if (syncStatus) {
            syncStatus.textContent = 'Connection issue — retrying...';
        }
    }
}

ticketsBody?.addEventListener('change', async (event) => {
    if (!event.target.classList.contains('status-checkbox')) return;

    const checkbox = event.target;
    const row = checkbox.closest('tr');
    const ticketNo = row?.dataset.ticketNo;
    if (!ticketNo) return;

    const newStatus = checkbox.checked ? checkbox.value : '';

    row.querySelectorAll('.status-checkbox').forEach((cb) => {
        if (cb !== checkbox) cb.checked = false;
    });

    isUpdatingStatus = true;
    try {
        const response = await fetch(`/api/tickets/${encodeURIComponent(ticketNo)}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (syncStatus) {
            syncStatus.textContent = `Saved status for Ticket #${ticketNo}`;
        }
    } catch (err) {
        console.error(err);
        if (syncStatus) {
            syncStatus.textContent = `Failed to save status for Ticket #${ticketNo}`;
        }
    } finally {
        isUpdatingStatus = false;
    }
});

const pollInterval = setInterval(fetchTickets, 5000);

window.addEventListener('beforeunload', () => {
    clearInterval(pollInterval);
});