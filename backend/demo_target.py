import re
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

router = APIRouter()

# In-memory realistic store for the Demo Target App
demo_users_db: List[Dict] = [
    {
        "id": 1,
        "full_name": "Sarah Connor",
        "work_email": "sarah.connor@cyberdyne.io",
        "role": "QA Lead",
        "status": "Active"
    },
    {
        "id": 2,
        "full_name": "Marcus Wright",
        "work_email": "marcus.wright@resistance.org",
        "role": "Platform Engineer",
        "status": "Active"
    }
]


class CreateUserRequest(BaseModel):
    full_name: str
    work_email: str
    role: str = "Software Engineer"


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    work_email: Optional[str] = None
    role: Optional[str] = None


@router.get("/demo-api/users", response_model=List[Dict])
async def get_demo_users():
    return demo_users_db


@router.post("/demo-api/users", status_code=status.HTTP_201_CREATED)
async def create_demo_user(payload: CreateUserRequest):
    """
    Demo Target User Creation API.
    Intentional Bugs for Bytesalt to Detect:
    1. Bug 1 (SQL Injection / Special Characters Crash 500):
       If full_name contains single quotes (') or SQL comment markers (--), it triggers an unhandled 500.
    2. Bug 2 (Domain validation error 400):
       If email lacks a proper dot extension.
    """
    name = payload.full_name or ""
    email = payload.work_email or ""

    # BUG 1: Intentional Backend 500 Crash on SQLi or special chars
    if "'" in name or "--" in name or "<" in name or ";" in name:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Unhandled SQL Syntax Exception near '''",
                "stacktrace": "File 'demo_target.py', line 54, in create_demo_user: cursor.execute(f'INSERT INTO users VALUES ({name})')",
                "root_cause": "Raw String Concatenation Vulnerability Triggered"
            }
        )

    # BUG 2: Intentional Email Validation Bug (400 Bad Request with rich payload)
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "InvalidEmailDomainException",
                "field": "work_email",
                "received_value": email,
                "message": "Work email domain must include a valid top-level domain (e.g. .com, .io)"
            }
        )

    new_user = {
        "id": len(demo_users_db) + 1,
        "full_name": name,
        "work_email": email,
        "role": payload.role,
        "status": "Active"
    }
    demo_users_db.append(new_user)
    return new_user


@router.put("/demo-api/users/{user_id}")
async def update_demo_user(user_id: int, payload: UpdateUserRequest):
    for u in demo_users_db:
        if u["id"] == user_id:
            if payload.full_name:
                u["full_name"] = payload.full_name
            if payload.work_email:
                u["work_email"] = payload.work_email
            if payload.role:
                u["role"] = payload.role
            return {"status": "success", "updated_user": u}
    raise HTTPException(status_code=404, detail="User not found")


@router.delete("/demo-api/users/{user_id}")
async def delete_demo_user(user_id: int):
    global demo_users_db
    demo_users_db = [u for u in demo_users_db if u["id"] != user_id]
    return {"status": "deleted", "user_id": user_id}


@router.get("/demo-app", response_class=HTMLResponse)
async def serve_demo_web_app():
    """
    Self-contained realistic buggy Single Page / Multi-Page Web App for Live Hackathon Testing.
    """
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bytesalt Target App - Enterprise User Management</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
    <!-- Navbar -->
    <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
                    B
                </div>
                <div>
                    <h1 class="text-sm font-bold tracking-wide text-white">Vivahika Enterprise Portal</h1>
                    <p class="text-xs text-slate-400">Target Web App under Automated QA Verification</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● Mock Server Online
                </span>
                <a href="#users-section" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Users List</a>
            </div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <!-- Live Toast Notifications -->
        <div id="toast-container" class="fixed top-20 right-6 z-50 space-y-2 max-w-md"></div>

        <!-- Hero Status -->
        <div class="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-xl p-6">
            <h2 class="text-xl font-bold text-white mb-1">Target Application Under Test</h2>
            <p class="text-sm text-slate-300">
                This live target application includes a registration form and interactive user management workflow with built-in backend edge cases (SQLi vulnerability, 500 crash, validation faults).
            </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Create User Form -->
            <div class="lg:col-span-5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-base font-semibold text-white">Create New User</h3>
                    <span class="text-xs text-slate-400">POST /demo-api/users</span>
                </div>

                <form id="create-user-form" class="space-y-4" onsubmit="handleCreateUser(event)">
                    <div>
                        <label for="full_name" class="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                        <input
                            type="text"
                            id="full_name"
                            name="full_name"
                            placeholder="e.g. Elena Rostova"
                            required
                            class="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label for="work_email" class="block text-xs font-medium text-slate-300 mb-1">Work Email *</label>
                        <input
                            type="email"
                            id="work_email"
                            name="work_email"
                            placeholder="elena@enterprise.io"
                            required
                            class="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label for="role" class="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
                        <select
                            id="role"
                            name="role"
                            class="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="Software Engineer">Software Engineer</option>
                            <option value="QA Architect">QA Architect</option>
                            <option value="Product Manager">Product Manager</option>
                            <option value="Security Analyst">Security Analyst</option>
                        </select>
                    </div>

                    <div class="pt-2">
                        <button
                            type="submit"
                            id="btn_create_user"
                            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
                        >
                            <span>Create User</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </button>
                    </div>
                </form>
            </div>

            <!-- Users Table -->
            <div id="users-section" class="lg:col-span-7 bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-xl">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-base font-semibold text-white">Existing Users Directory</h3>
                        <p class="text-xs text-slate-400">Click Edit to test multi-page chained integration flows</p>
                    </div>
                    <button
                        id="btn_refresh_table"
                        onclick="loadUsers()"
                        class="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                    >
                        Refresh Table
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-700">
                            <tr>
                                <th class="py-3 px-3">Name</th>
                                <th class="py-3 px-3">Email</th>
                                <th class="py-3 px-3">Role</th>
                                <th class="py-3 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body" class="divide-y divide-slate-700/50">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Inline Edit & Details Drawer / Modal -->
        <div id="edit-modal" class="hidden bg-slate-800 border border-indigo-500/40 rounded-xl p-6 shadow-2xl transition-all">
            <div class="flex items-center justify-between pb-3 border-b border-slate-700">
                <h4 class="text-sm font-bold text-white flex items-center space-x-2">
                    <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span>Edit User Details (Chained Multi-Page Test Step)</span>
                </h4>
                <button id="btn_close_edit" onclick="closeEditModal()" class="text-slate-400 hover:text-white text-xs">✕ Close</button>
            </div>
            <form id="edit-user-form" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4" onsubmit="handleUpdateUser(event)">
                <input type="hidden" id="edit_user_id" />
                <div>
                    <label for="edit_full_name" class="block text-xs font-medium text-slate-300 mb-1">Updated Name</label>
                    <input
                        type="text"
                        id="edit_full_name"
                        name="edit_full_name"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                        required
                    />
                </div>
                <div>
                    <label for="edit_role" class="block text-xs font-medium text-slate-300 mb-1">Role</label>
                    <select id="edit_role" name="edit_role" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
                        <option value="Lead Engineer">Lead Engineer</option>
                        <option value="Staff QA">Staff QA</option>
                        <option value="VP of Engineering">VP of Engineering</option>
                    </select>
                </div>
                <div class="flex items-end space-x-2">
                    <button
                        type="submit"
                        id="btn_save_edit"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors w-full"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    </main>

    <script>
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const colorClass = type === 'error' ? 'bg-red-900/90 border-red-700 text-red-200' :
                               type === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-200' :
                               'bg-slate-800 border-slate-700 text-slate-200';

            toast.className = `p-3.5 rounded-lg border shadow-xl text-xs flex items-start space-x-2 animate-fade-in ${colorClass}`;
            toast.innerHTML = `
                <div class="flex-1 font-mono">${message}</div>
                <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">✕</button>
            `;
            container.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 6000);
        }

        async function loadUsers() {
            try {
                const res = await fetch('/demo-api/users');
                const users = await res.json();
                const tbody = document.getElementById('users-table-body');
                tbody.innerHTML = '';

                users.forEach(u => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-700/30 transition-colors';
                    tr.innerHTML = `
                        <td class="py-3 px-3 font-medium text-slate-100">${u.full_name}</td>
                        <td class="py-3 px-3 text-slate-400">${u.work_email}</td>
                        <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[10px]">${u.role}</span>
                        </td>
                        <td class="py-3 px-3 text-right space-x-1">
                            <button
                                onclick="openEditModal(${u.id}, '${u.full_name.replace(/'/g, "\\\\'")}', '${u.role}')"
                                class="btn-edit px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[11px] transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onclick="showToast('Viewing details for user #' + ${u.id}, 'info')"
                                class="btn-details px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[11px] transition-colors"
                            >
                                View Details
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                showToast('Failed to fetch users: ' + err.message, 'error');
            }
        }

        async function handleCreateUser(e) {
            e.preventDefault();
            const fullName = document.getElementById('full_name').value;
            const workEmail = document.getElementById('work_email').value;
            const role = document.getElementById('role').value;

            try {
                const res = await fetch('/demo-api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name: fullName, work_email: workEmail, role: role })
                });

                const data = await res.json();

                if (!res.ok) {
                    showToast(`HTTP ${res.status}: ${JSON.stringify(data.detail || data)}`, 'error');
                } else {
                    showToast(`User created successfully: ${data.full_name}`, 'success');
                    document.getElementById('create-user-form').reset();
                    loadUsers();
                }
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            }
        }

        function openEditModal(id, name, role) {
            const modal = document.getElementById('edit-modal');
            modal.classList.remove('hidden');
            document.getElementById('edit_user_id').value = id;
            document.getElementById('edit_full_name').value = name;
            document.getElementById('edit_role').value = role;
            modal.scrollIntoView({ behavior: 'smooth' });
        }

        function closeEditModal() {
            document.getElementById('edit-modal').classList.add('hidden');
        }

        async function handleUpdateUser(e) {
            e.preventDefault();
            const id = document.getElementById('edit_user_id').value;
            const name = document.getElementById('edit_full_name').value;
            const role = document.getElementById('edit_role').value;

            try {
                const res = await fetch(`/demo-api/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name: name, role: role })
                });

                if (res.ok) {
                    showToast(`User updated successfully!`, 'success');
                    closeEditModal();
                    loadUsers();
                } else {
                    const errData = await res.json();
                    showToast(`Update failed: ${JSON.stringify(errData)}`, 'error');
                }
            } catch (err) {
                showToast('Update error: ' + err.message, 'error');
            }
        }

        // Initialize table
        document.addEventListener('DOMContentLoaded', loadUsers);
    </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)
