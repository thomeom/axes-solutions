import os
import uuid
import logging
import json
import io
from html import escape
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List, Callable, Literal, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, DateTime, Text, Integer
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from jose import jwt, JWTError
import bcrypt

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
except ImportError:  # pragma: no cover - runtime dependency is installed by requirements.txt
    colors = None
    A4 = None
    ParagraphStyle = None
    getSampleStyleSheet = None
    mm = None
    pdfmetrics = None
    TTFont = None
    Paragraph = None
    SimpleDocTemplate = None
    Spacer = None
    Table = None
    TableStyle = None


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


JWT_SECRET = os.environ.get("JWT_SECRET", "axes-solutions-diploma-secret-key-2025")
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 12
VALID_ROLES = {"admin", "user"}
ROLE_ALIASES = {
    "client": "user",
    "manager": "admin",
    "moderator": "admin",
}
REQUEST_STATUSES = {"new", "in_progress", "review", "done", "cancelled"}
PROJECT_STATUSES = {"new", "in_progress", "review", "done", "cancelled"}

DB_PATH = ROOT_DIR / "axes.db"
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin")
    name = Column(String, default="")
    company = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ServiceRequest(Base):
    __tablename__ = "requests"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, default="")
    title = Column(String, default="")
    service = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String, default="normal")
    budget = Column(String, default="")
    deadline = Column(String, default="")
    tags = Column(Text, default="[]")
    details = Column(Text, default="{}")
    summary = Column(Text, default="")
    estimate = Column(String, default="")
    complexity = Column(String, default="")
    project_id = Column(String, default="")
    status = Column(String, default="new")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SmartProject(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = Column(String, default="")
    title = Column(String, nullable=False)
    company = Column(String, default="")
    email = Column(String, default="")
    service = Column(String, default="")
    status = Column(String, default="new")
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Review(Base):
    __tablename__ = "reviews"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    company = Column(String, default="")
    rating = Column(Integer, default=5)
    text = Column(Text, nullable=False)
    approved = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    name = Column(String, default="")
    email = Column(String, default="")
    status = Column(String, default="open")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, index=True)
    sender = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Specialist(Base):
    __tablename__ = "specialists"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    service = Column(String, nullable=False, index=True)
    specialization = Column(String, default="")
    skills = Column(Text, default="[]")
    keywords = Column(Text, default="[]")
    experience_years = Column(Integer, default=1)
    rating_x10 = Column(Integer, default=45)
    availability_status = Column(String, default="available")
    photo = Column(String, default="")
    projects_completed = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(bind=engine)


def ensure_column(table: str, column: str, definition: str) -> None:
    with engine.begin() as conn:
        existing = [row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")]
        if column not in existing:
            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def migrate_schema() -> None:
    for column, definition in {
        "name": "VARCHAR DEFAULT ''",
        "company": "VARCHAR DEFAULT ''",
    }.items():
        ensure_column("users", column, definition)

    for column, definition in {
        "phone": "VARCHAR DEFAULT ''",
        "title": "VARCHAR DEFAULT ''",
        "priority": "VARCHAR DEFAULT 'normal'",
        "budget": "VARCHAR DEFAULT ''",
        "deadline": "VARCHAR DEFAULT ''",
        "tags": "TEXT DEFAULT '[]'",
        "details": "TEXT DEFAULT '{}'",
        "summary": "TEXT DEFAULT ''",
        "estimate": "VARCHAR DEFAULT ''",
        "complexity": "VARCHAR DEFAULT ''",
        "project_id": "VARCHAR DEFAULT ''",
    }.items():
        ensure_column("requests", column, definition)


migrate_schema()


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    company: Optional[str] = Field(default="", max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=80)


class TokenOut(BaseModel):
    token: str
    email: str
    role: str
    name: str = ""
    company: str = ""


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    name: str = ""
    company: str = ""
    created_at: str


class RequestIn(BaseModel):
    company: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default="", max_length=40)
    title: Optional[str] = Field(default="", max_length=160)
    service: str
    message: str = Field(min_length=5, max_length=2000)
    priority: Optional[str] = Field(default="normal", max_length=40)
    budget: Optional[str] = Field(default="", max_length=120)
    deadline: Optional[str] = Field(default="", max_length=120)
    tags: Optional[List[str]] = Field(default_factory=list)
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    summary: Optional[str] = Field(default="", max_length=1000)
    estimate: Optional[str] = Field(default="", max_length=120)
    complexity: Optional[str] = Field(default="", max_length=80)


class RequestOut(BaseModel):
    id: str
    company: str
    email: str
    phone: str = ""
    title: str = ""
    service: str
    message: str
    priority: str = "normal"
    budget: str = ""
    deadline: str = ""
    tags: List[str] = []
    details: Dict[str, Any] = {}
    summary: str = ""
    estimate: str = ""
    complexity: str = ""
    project_id: str = ""
    recommended_specialist: Optional[Dict[str, Any]] = None
    status: str
    created_at: str


class StatusUpdate(BaseModel):
    status: str


class ProjectIn(BaseModel):
    request_id: Optional[str] = ""
    title: str = Field(min_length=2, max_length=160)
    company: Optional[str] = Field(default="", max_length=120)
    email: Optional[EmailStr] = None
    service: str = Field(default="", max_length=60)
    status: str = Field(default="new", max_length=40)
    payload: Dict[str, Any]


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=160)
    company: Optional[str] = Field(default=None, max_length=120)
    email: Optional[EmailStr] = None
    service: Optional[str] = Field(default=None, max_length=60)
    status: Optional[str] = Field(default=None, max_length=40)
    payload: Optional[Dict[str, Any]] = None


class ProjectOut(BaseModel):
    id: str
    request_id: str
    title: str
    company: str
    email: str
    service: str
    status: str
    payload: Dict[str, Any]
    created_at: str
    updated_at: str


class DocumentGenerateIn(BaseModel):
    doc_type: Literal["contract", "nda"] = "contract"
    lang: Literal["ru", "kz", "en"] = "ru"
    project_id: Optional[str] = ""
    company: str = Field(min_length=2, max_length=160)
    bin: Optional[str] = Field(default="", max_length=32)
    address: Optional[str] = Field(default="", max_length=240)
    director: Optional[str] = Field(default="", max_length=120)
    contact_email: Optional[EmailStr] = None


class ReviewIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    company: Optional[str] = ""
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=5, max_length=1000)


class ReviewOut(BaseModel):
    id: str
    name: str
    company: str
    rating: int
    text: str
    approved: bool
    created_at: str


class ReviewApproval(BaseModel):
    approved: bool


class ChatStartIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=80)
    name: Optional[str] = Field(default="", max_length=80)
    email: Optional[EmailStr] = None


class ChatMessageIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=80)
    text: str = Field(min_length=1, max_length=1200)


class AdminChatMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1200)


class ChatSessionOut(BaseModel):
    id: str
    client_id: str
    name: str
    email: str
    status: str
    created_at: str
    updated_at: str
    last_message: Optional[str] = ""
    unread_client_messages: int = 0


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    sender: Literal["client", "admin", "system"]
    text: str
    created_at: str


class SpecialistOut(BaseModel):
    id: str
    name: str
    service: str
    specialization: str
    skills: List[str]
    keywords: List[str]
    experience_years: int
    rating: float
    availability_status: str
    photo: str
    projects_completed: int
    tasks_completed: int


class SpecialistRecommendationOut(BaseModel):
    specialist: SpecialistOut
    score: float
    reasons: List[str]


class AdminStatsOut(BaseModel):
    projects_total: int
    active_requests: int
    completed_tasks: int
    specialists_total: int
    average_specialist_rating: float
    users_total: int


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_role(role: str) -> str:
    normalized = ROLE_ALIASES.get((role or "").strip().lower(), (role or "user").strip().lower())
    return normalized if normalized in VALID_ROLES else "user"


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": normalize_role(user.role),
        "name": user.name or "",
        "company": user.company or "",
        "created_at": user.created_at.isoformat(),
    }


def parse_tags(raw: str) -> List[str]:
    try:
        value = json.loads(raw or "[]")
        return value if isinstance(value, list) else []
    except json.JSONDecodeError:
        return []


def parse_details(raw: str) -> Dict[str, Any]:
    try:
        value = json.loads(raw or "{}")
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def parse_string_list(raw: str) -> List[str]:
    try:
        value = json.loads(raw or "[]")
        return [str(item) for item in value] if isinstance(value, list) else []
    except json.JSONDecodeError:
        return []


def serialize_specialist(item: Specialist) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "service": item.service,
        "specialization": item.specialization or "",
        "skills": parse_string_list(item.skills),
        "keywords": parse_string_list(item.keywords),
        "experience_years": item.experience_years or 0,
        "rating": round((item.rating_x10 or 0) / 10, 1),
        "availability_status": item.availability_status or "available",
        "photo": item.photo or "",
        "projects_completed": item.projects_completed or 0,
        "tasks_completed": item.tasks_completed or 0,
    }


def seed_specialists() -> None:
    data = [
        {
            "name": "Nikita Romanov",
            "service": "it",
            "specialization": "Backend and CRM integrations",
            "skills": ["FastAPI", "Python", "API", "CRM", "Databases"],
            "keywords": ["backend", "api", "crm", "integration", "automation", "database", "python", "fastapi"],
            "experience_years": 7,
            "rating_x10": 49,
            "availability_status": "available",
            "photo": "../img/specialists/nikita-romanov.jpg",
            "projects_completed": 38,
            "tasks_completed": 420,
        },
        {
            "name": "Maria Kim",
            "service": "it",
            "specialization": "QA automation and release quality",
            "skills": ["QA", "Autotests", "Regression", "Release"],
            "keywords": ["qa", "testing", "quality", "autotest", "regression", "release"],
            "experience_years": 6,
            "rating_x10": 48,
            "availability_status": "busy",
            "photo": "../img/specialists/maria-kim.jpg",
            "projects_completed": 31,
            "tasks_completed": 360,
        },
        {
            "name": "Azamat Sadykov",
            "service": "it",
            "specialization": "System administration and infrastructure",
            "skills": ["Servers", "Backups", "Email", "SSL", "Monitoring"],
            "keywords": ["server", "backup", "email", "ssl", "monitoring", "infrastructure", "admin", "domain"],
            "experience_years": 8,
            "rating_x10": 47,
            "availability_status": "available",
            "photo": "../img/specialists/azamat-sadykov.jpg",
            "projects_completed": 33,
            "tasks_completed": 380,
        },
        {
            "name": "Dmitry Alekseev",
            "service": "it",
            "specialization": "Backend development and internal systems",
            "skills": ["Backend", "Databases", "CRM", "Integrations"],
            "keywords": ["backend", "database", "crm", "api", "integration", "internal", "service"],
            "experience_years": 6,
            "rating_x10": 47,
            "availability_status": "available",
            "photo": "../img/specialists/dmitry-alekseev.jpg",
            "projects_completed": 29,
            "tasks_completed": 315,
        },
        {
            "name": "Laura Omarova",
            "service": "it",
            "specialization": "Frontend interfaces and forms",
            "skills": ["Frontend", "Responsive UI", "Forms", "Animation"],
            "keywords": ["frontend", "ui", "interface", "form", "responsive", "animation", "website"],
            "experience_years": 5,
            "rating_x10": 46,
            "availability_status": "available",
            "photo": "../img/specialists/laura-omarova.jpg",
            "projects_completed": 24,
            "tasks_completed": 280,
        },
        {
            "name": "Ruslan Nurtayev",
            "service": "it",
            "specialization": "DevOps deployment and monitoring",
            "skills": ["DevOps", "Deploy", "SSL", "Backups", "Monitoring"],
            "keywords": ["devops", "deploy", "deployment", "ssl", "backup", "monitoring", "domain"],
            "experience_years": 7,
            "rating_x10": 48,
            "availability_status": "busy",
            "photo": "../img/specialists/ruslan-nurtayev.jpg",
            "projects_completed": 32,
            "tasks_completed": 345,
        },
        {
            "name": "Alina Muratova",
            "service": "hr",
            "specialization": "Recruitment and HR operations",
            "skills": ["Recruiting", "Onboarding", "HR docs", "Payroll"],
            "keywords": ["recruiting", "vacancy", "onboarding", "hr", "payroll", "personnel", "staff"],
            "experience_years": 8,
            "rating_x10": 49,
            "availability_status": "available",
            "photo": "../img/specialists/alina-muratova.jpg",
            "projects_completed": 44,
            "tasks_completed": 510,
        },
        {
            "name": "Erlan Kasymov",
            "service": "hr",
            "specialization": "HR administration and compliance",
            "skills": ["HR records", "Labor docs", "SLA", "Reports"],
            "keywords": ["hrdocs", "labor", "documents", "records", "compliance", "reports"],
            "experience_years": 5,
            "rating_x10": 46,
            "availability_status": "available",
            "photo": "../img/specialists/erlan-kasymov.jpg",
            "projects_completed": 27,
            "tasks_completed": 295,
        },
        {
            "name": "Dana Seisenova",
            "service": "hr",
            "specialization": "Recruiting and candidate funnels",
            "skills": ["Recruiting", "Screening", "Interviews", "Funnels"],
            "keywords": ["recruiting", "candidate", "interview", "vacancy", "screening", "funnel", "hiring"],
            "experience_years": 6,
            "rating_x10": 48,
            "availability_status": "available",
            "photo": "../img/specialists/dana-seisenova.jpg",
            "projects_completed": 35,
            "tasks_completed": 405,
        },
        {
            "name": "Zhanna Akhmetova",
            "service": "hr",
            "specialization": "HR analytics and reporting",
            "skills": ["HR analytics", "Reports", "Vacancy funnels", "Dashboards"],
            "keywords": ["analytics", "hr", "report", "dashboard", "vacancy", "funnel", "metrics"],
            "experience_years": 7,
            "rating_x10": 47,
            "availability_status": "busy",
            "photo": "../img/specialists/zhanna-akhmetova.jpg",
            "projects_completed": 30,
            "tasks_completed": 330,
        },
        {
            "name": "Ilya Borisov",
            "service": "hr",
            "specialization": "Onboarding and adaptation",
            "skills": ["Onboarding", "Checklists", "Adaptation", "HR support"],
            "keywords": ["onboarding", "adaptation", "checklist", "new employee", "hr", "support"],
            "experience_years": 5,
            "rating_x10": 46,
            "availability_status": "available",
            "photo": "../img/specialists/ilya-borisov.jpg",
            "projects_completed": 22,
            "tasks_completed": 260,
        },
        {
            "name": "Madina Kozhakhmet",
            "service": "hr",
            "specialization": "HR audit and employee files",
            "skills": ["HR audit", "Employee files", "Labor contracts", "Compliance"],
            "keywords": ["audit", "employee", "file", "contract", "labor", "compliance", "hrdocs"],
            "experience_years": 8,
            "rating_x10": 48,
            "availability_status": "available",
            "photo": "../img/specialists/madina-kozhakhmet.jpg",
            "projects_completed": 32,
            "tasks_completed": 350,
        },
        {
            "name": "Gulnara Abdiyeva",
            "service": "accounting",
            "specialization": "Tax accounting and reporting",
            "skills": ["Tax", "Payroll", "1C", "Reporting"],
            "keywords": ["tax", "accounting", "salary", "payroll", "reporting", "1c", "documents"],
            "experience_years": 11,
            "rating_x10": 49,
            "availability_status": "available",
            "photo": "../img/specialists/gulnara-abdiyeva.jpg",
            "projects_completed": 56,
            "tasks_completed": 690,
        },
        {
            "name": "Timur Musin",
            "service": "accounting",
            "specialization": "Management reporting and accounting recovery",
            "skills": ["Audit", "BI", "Recovery", "Management reports"],
            "keywords": ["audit", "recovery", "management", "report", "finance", "bi", "accounting"],
            "experience_years": 9,
            "rating_x10": 47,
            "availability_status": "busy",
            "photo": "../img/specialists/timur-musin.jpg",
            "projects_completed": 37,
            "tasks_completed": 430,
        },
        {
            "name": "Saule Nurpeisova",
            "service": "accounting",
            "specialization": "Payroll accounting",
            "skills": ["Payroll", "Vacation pay", "Sick leave", "Taxes"],
            "keywords": ["payroll", "salary", "vacation", "sick leave", "tax", "employee", "calculation"],
            "experience_years": 9,
            "rating_x10": 48,
            "availability_status": "available",
            "photo": "../img/specialists/saule-nurpeisova.jpg",
            "projects_completed": 42,
            "tasks_completed": 520,
        },
        {
            "name": "Viktor Li",
            "service": "accounting",
            "specialization": "Primary documents and reconciliations",
            "skills": ["Acts", "Invoices", "Bank statements", "Reconciliation"],
            "keywords": ["acts", "invoice", "bank", "statement", "documents", "reconciliation", "primary"],
            "experience_years": 6,
            "rating_x10": 46,
            "availability_status": "available",
            "photo": "../img/specialists/viktor-li.jpg",
            "projects_completed": 28,
            "tasks_completed": 370,
        },
        {
            "name": "Ainur Kenzheeva",
            "service": "accounting",
            "specialization": "Tax consulting and regime checks",
            "skills": ["Tax regime", "Tax risks", "Consulting", "Audit prep"],
            "keywords": ["tax", "regime", "risk", "consulting", "audit", "check", "accounting"],
            "experience_years": 10,
            "rating_x10": 48,
            "availability_status": "busy",
            "photo": "../img/specialists/ainur-kenzheeva.jpg",
            "projects_completed": 39,
            "tasks_completed": 455,
        },
        {
            "name": "Lyazzat Sarsenova",
            "service": "accounting",
            "specialization": "Document workflow coordination",
            "skills": ["Documents", "Deadlines", "Reconciliations", "Closing docs"],
            "keywords": ["document", "deadline", "act", "invoice", "reconciliation", "workflow", "closing"],
            "experience_years": 6,
            "rating_x10": 47,
            "availability_status": "available",
            "photo": "../img/specialists/lyazzat-sarsenova.jpg",
            "projects_completed": 31,
            "tasks_completed": 390,
        },
        {
            "name": "Rustam Tulegenov",
            "service": "legal",
            "specialization": "Corporate law and contracts",
            "skills": ["Contracts", "Corporate law", "Claims", "NDA"],
            "keywords": ["contract", "nda", "corporate", "legal", "claim", "law", "registration", "labor"],
            "experience_years": 10,
            "rating_x10": 48,
            "availability_status": "available",
            "photo": "../img/specialists/rustam-tulegenov.jpg",
            "projects_completed": 41,
            "tasks_completed": 385,
        },
        {
            "name": "Aigerim Esenova",
            "service": "legal",
            "specialization": "Contract review and risk control",
            "skills": ["Contract review", "Risk", "Labor law", "Negotiations"],
            "keywords": ["contract", "risk", "review", "labor", "legal", "agreement", "dispute"],
            "experience_years": 7,
            "rating_x10": 47,
            "availability_status": "available",
            "photo": "../img/specialists/aigerim-esenova.jpg",
            "projects_completed": 34,
            "tasks_completed": 310,
        },
        {
            "name": "Kamila Nurlan",
            "service": "legal",
            "specialization": "Notarial services coordination",
            "skills": ["Notary", "Powers of attorney", "Applications", "Copies"],
            "keywords": ["notary", "notarial", "power", "attorney", "application", "copy", "documents"],
            "experience_years": 6,
            "rating_x10": 46,
            "availability_status": "available",
            "photo": "../img/specialists/kamila-nurlan.jpg",
            "projects_completed": 26,
            "tasks_completed": 290,
        },
        {
            "name": "Mikhail Sokolov",
            "service": "legal",
            "specialization": "Claims and dispute documents",
            "skills": ["Claims", "Debt", "Disputes", "Counterparty responses"],
            "keywords": ["claim", "debt", "dispute", "counterparty", "response", "legal", "court"],
            "experience_years": 9,
            "rating_x10": 48,
            "availability_status": "busy",
            "photo": "../img/specialists/mikhail-sokolov.jpg",
            "projects_completed": 36,
            "tasks_completed": 340,
        },
        {
            "name": "Diana Rakhimova",
            "service": "legal",
            "specialization": "Employment law and HR legal review",
            "skills": ["Employment contracts", "Job descriptions", "Orders", "Labor disputes"],
            "keywords": ["employment", "labor", "contract", "job description", "order", "hr", "dispute"],
            "experience_years": 8,
            "rating_x10": 47,
            "availability_status": "available",
            "photo": "../img/specialists/diana-rakhimova.jpg",
            "projects_completed": 33,
            "tasks_completed": 320,
        },
        {
            "name": "Arman Suleimenov",
            "service": "legal",
            "specialization": "LLP registration and corporate changes",
            "skills": ["LLP registration", "Founding documents", "Participant decisions", "Corporate changes"],
            "keywords": ["registration", "llp", "founding", "corporate", "decision", "change", "documents"],
            "experience_years": 7,
            "rating_x10": 46,
            "availability_status": "available",
            "photo": "../img/specialists/arman-suleimenov.jpg",
            "projects_completed": 30,
            "tasks_completed": 300,
        },
    ]

    db = SessionLocal()
    try:
        for item in data:
            specialist = db.query(Specialist).filter(Specialist.name == item["name"]).first()
            if specialist is None:
                specialist = Specialist(name=item["name"])
                db.add(specialist)

            specialist.service = item["service"]
            specialist.specialization = item["specialization"]
            specialist.skills = json.dumps(item["skills"], ensure_ascii=False)
            specialist.keywords = json.dumps(item["keywords"], ensure_ascii=False)
            specialist.experience_years = item["experience_years"]
            specialist.rating_x10 = item["rating_x10"]
            specialist.availability_status = item["availability_status"]
            specialist.photo = item["photo"]
            specialist.projects_completed = item["projects_completed"]
            specialist.tasks_completed = item["tasks_completed"]
        db.commit()
    finally:
        db.close()


SERVICE_COST_PROFILES = {
    "it": {
        "name": "IT development and support",
        "monthly_rates": {"junior": 650_000, "middle": 1_050_000, "senior": 1_650_000},
        "staff_salary": {"junior": 520_000, "middle": 900_000, "senior": 1_350_000},
        "default_team": {"junior": 1, "middle": 1, "senior": 1},
    },
    "hr": {
        "name": "HR outsourcing",
        "monthly_rates": {"junior": 360_000, "middle": 590_000, "senior": 880_000},
        "staff_salary": {"junior": 320_000, "middle": 520_000, "senior": 760_000},
        "default_team": {"junior": 0, "middle": 1, "senior": 1},
    },
    "accounting": {
        "name": "Accounting support",
        "monthly_rates": {"junior": 310_000, "middle": 520_000, "senior": 820_000},
        "staff_salary": {"junior": 280_000, "middle": 460_000, "senior": 700_000},
        "default_team": {"junior": 1, "middle": 1, "senior": 0},
    },
    "legal": {
        "name": "Legal support",
        "monthly_rates": {"junior": 340_000, "middle": 620_000, "senior": 980_000},
        "staff_salary": {"junior": 300_000, "middle": 540_000, "senior": 840_000},
        "default_team": {"junior": 0, "middle": 1, "senior": 1},
    },
}

MODEL_MULTIPLIERS = {
    "outstaffing": 0.96,
    "dedicated": 1.08,
    "fixed": 1.18,
}

MODEL_LABELS = {
    "outstaffing": "Outstaffing",
    "dedicated": "Dedicated Team",
    "fixed": "Fixed Price",
}


def safe_int(value: Any, fallback: int = 0, minimum: int = 0, maximum: int = 99) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(number, maximum))


def money(value: float) -> str:
    return f"{round(value / 10_000) * 10_000:,.0f}".replace(",", " ")


def calculate_engagement(service: str, details: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    profile = SERVICE_COST_PROFILES.get(service, SERVICE_COST_PROFILES["hr"])
    details = details or {}
    team_data = details.get("team") if isinstance(details.get("team"), dict) else {}
    team = {
        "junior": safe_int(team_data.get("junior"), profile["default_team"]["junior"], 0, 12),
        "middle": safe_int(team_data.get("middle"), profile["default_team"]["middle"], 0, 12),
        "senior": safe_int(team_data.get("senior"), profile["default_team"]["senior"], 0, 12),
    }
    if sum(team.values()) == 0:
        team = dict(profile["default_team"])

    duration = safe_int(details.get("durationMonths"), 3, 1, 36)
    model = details.get("collaborationModel") or "outstaffing"
    if model not in MODEL_MULTIPLIERS:
        model = "outstaffing"

    stack = details.get("stack") if isinstance(details.get("stack"), list) else []
    monthly_outsource = sum(profile["monthly_rates"][level] * count for level, count in team.items())
    stack_factor = 1 + min(len(stack), 6) * 0.015
    model_factor = MODEL_MULTIPLIERS[model]
    outsourcing_base = monthly_outsource * duration * model_factor * stack_factor
    outsourcing_min = outsourcing_base * 0.9
    outsourcing_max = outsourcing_base * 1.14
    outsourcing_avg = (outsourcing_min + outsourcing_max) / 2

    monthly_staff_salary = sum(profile["staff_salary"][level] * count for level, count in team.items())
    headcount = sum(team.values())
    payroll_taxes = monthly_staff_salary * duration * 0.215
    workplaces = 85_000 * headcount * duration
    hiring = 240_000 * headcount
    hr_admin = 55_000 * headcount * duration
    paid_idle_risk = monthly_staff_salary * duration * 0.08
    staff_total = monthly_staff_salary * duration + payroll_taxes + workplaces + hiring + hr_admin + paid_idle_risk

    savings = max(staff_total - outsourcing_avg, 0)
    savings_percent = round((savings / staff_total) * 100) if staff_total else 0
    planned_hours = headcount * duration * (150 if model != "fixed" else 132)

    return {
        "service": service,
        "serviceLabel": profile["name"],
        "team": team,
        "headcount": headcount,
        "durationMonths": duration,
        "model": model,
        "modelLabel": MODEL_LABELS[model],
        "stack": stack,
        "outsourcingMin": round(outsourcing_min),
        "outsourcingMax": round(outsourcing_max),
        "outsourcingAvg": round(outsourcing_avg),
        "outsourcingLabel": f"{money(outsourcing_min)}–{money(outsourcing_max)} ₸",
        "staffTotal": round(staff_total),
        "staffLabel": f"{money(staff_total)} ₸",
        "savings": round(savings),
        "savingsLabel": f"{money(savings)} ₸",
        "savingsPercent": savings_percent,
        "plannedHours": planned_hours,
        "assumptions": [
            "taxes and social contributions: 21.5%",
            "workplace, equipment, and software: 85,000 ₸ per person monthly",
            "recruiting and onboarding: 240,000 ₸ per specialist",
            "HR/administration: 55,000 ₸ per person monthly",
        ],
    }


def serialize_request(item: ServiceRequest) -> dict:
    details = parse_details(item.details)
    return {
        "id": item.id,
        "company": item.company,
        "email": item.email,
        "phone": item.phone or "",
        "title": item.title or "",
        "service": item.service,
        "message": item.message,
        "priority": item.priority or "normal",
        "budget": item.budget or "",
        "deadline": item.deadline or "",
        "tags": parse_tags(item.tags),
        "details": details,
        "summary": item.summary or "",
        "estimate": item.estimate or "",
        "complexity": item.complexity or "",
        "project_id": item.project_id or "",
        "recommended_specialist": details.get("recommendedSpecialist") if isinstance(details, dict) else None,
        "status": item.status,
        "created_at": item.created_at.isoformat(),
    }


def estimate_request(data: RequestIn) -> dict:
    if data.details:
        engagement = calculate_engagement(data.service, data.details)
        complexity = "high" if engagement["headcount"] >= 4 or engagement["durationMonths"] >= 6 else "medium"
        return {
            "estimate": engagement["outsourcingLabel"],
            "complexity": complexity,
        }

    service_ranges = {
        "hr": (120_000, 420_000),
        "it": (350_000, 1_800_000),
        "accounting": (90_000, 380_000),
        "legal": (80_000, 520_000),
    }
    base_min, base_max = service_ranges.get(data.service, (100_000, 450_000))
    text = f"{data.title or ''} {data.message}".lower()
    tags = set(data.tags or [])
    multiplier = 1.0

    if data.priority == "urgent":
        multiplier += 0.25
    if "longTerm" in tags:
        multiplier += 0.2
    if "fullService" in tags:
        multiplier += 0.25
    if len(text) > 700:
        multiplier += 0.15
    if any(word in text for word in ["интеграц", "автоматизац", "суд", "аудит", "миграц", "договоров"]):
        multiplier += 0.2

    min_price = round(base_min * multiplier / 10_000) * 10_000
    max_price = round(base_max * multiplier / 10_000) * 10_000
    complexity = "high" if multiplier >= 1.35 else "medium"

    return {
        "estimate": f"{min_price:,}–{max_price:,} ₸".replace(",", " "),
        "complexity": complexity,
    }


def recommendation_text(data: RequestIn) -> str:
    details = data.details or {}
    detail_values: List[str] = []
    for key in ("outcome", "currentProcess", "collaborationModel"):
        value = details.get(key)
        if isinstance(value, str):
            detail_values.append(value)

    stack = details.get("stack")
    if isinstance(stack, list):
        detail_values.extend(str(item) for item in stack)

    return " ".join([
        data.service or "",
        data.title or "",
        data.message or "",
        " ".join(data.tags or []),
        " ".join(detail_values),
    ]).lower()


def recommend_specialist_for_request(data: RequestIn, db: Session) -> Optional[dict]:
    specialists = db.query(Specialist).all()
    if not specialists:
        return None

    text = recommendation_text(data)
    service = (data.service or "").lower()
    best: Optional[dict] = None

    for specialist in specialists:
        serialized = serialize_specialist(specialist)
        keywords = [item.lower() for item in serialized["keywords"] + serialized["skills"]]
        matched = sorted({word for word in keywords if word and word in text})
        score = 0.0
        reasons: List[str] = []

        if serialized["service"] == service:
            score += 40
            reasons.append("service-match")

        if matched:
            score += min(len(matched), 8) * 7
            reasons.append("keyword-match")

        if serialized["availability_status"] == "available":
            score += 10
            reasons.append("available")
        elif serialized["availability_status"] == "busy":
            score += 3

        score += serialized["rating"] * 6
        score += min(serialized["experience_years"], 12)
        score += min(serialized["projects_completed"], 50) / 5

        candidate = {
            "specialist": serialized,
            "score": round(score, 1),
            "reasons": reasons or ["rating-and-experience"],
        }
        if best is None or candidate["score"] > best["score"]:
            best = candidate

    return best


def serialize_project(item: SmartProject) -> dict:
    try:
        payload = json.loads(item.payload or "{}")
    except json.JSONDecodeError:
        payload = {}

    return {
        "id": item.id,
        "request_id": item.request_id or "",
        "title": item.title,
        "company": item.company or "",
        "email": item.email or "",
        "service": item.service or "",
        "status": item.status,
        "payload": payload,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def serialize_review(item: Review) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "company": item.company or "",
        "rating": item.rating,
        "text": item.text,
        "approved": bool(item.approved),
        "created_at": item.created_at.isoformat(),
    }


def serialize_chat_session(item: ChatSession, db: Session) -> dict:
    last = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == item.id)
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    unread = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == item.id, ChatMessage.sender == "client")
        .count()
    )

    return {
        "id": item.id,
        "client_id": item.client_id,
        "name": item.name or "",
        "email": item.email or "",
        "status": item.status,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
        "last_message": last.text if last else "",
        "unread_client_messages": unread,
    }


def serialize_chat_message(item: ChatMessage) -> dict:
    return {
        "id": item.id,
        "session_id": item.session_id,
        "sender": item.sender,
        "text": item.text,
        "created_at": item.created_at.isoformat(),
    }


def get_or_create_chat_session(db: Session, data: ChatStartIn) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.client_id == data.client_id, ChatSession.status == "open")
        .order_by(ChatSession.updated_at.desc())
        .first()
    )

    if session is None:
        session = ChatSession(
            client_id=data.client_id,
            name=(data.name or "").strip(),
            email=str(data.email or ""),
        )
        db.add(session)
    else:
        if data.name:
            session.name = data.name.strip()
        if data.email:
            session.email = str(data.email)

    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def create_token(user: User) -> str:
    payload = {
        "sub": user.email,
        "role": normalize_role(user.role),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def seed_users() -> None:
    demo_users = [
        ("admin@axessolution.com", "Admin@123", "admin", "Axes Admin", "Axes Solutions"),
        ("client@axessolution.com", "Client@123", "user", "Demo Client", "Demo Company"),
    ]

    db = SessionLocal()
    try:
        for user in db.query(User).all():
            normalized = normalize_role(user.role)
            if user.role != normalized:
                user.role = normalized

        for email, password, role, name, company in demo_users:
            user = db.query(User).filter(User.email == email).first()
            if user is None:
                user = User(email=email)
                db.add(user)
            user.password_hash = hash_password(password)
            user.role = role
            user.name = user.name or name
            user.company = user.company or company
        db.commit()
    finally:
        db.close()


seed_users()
seed_specialists()


bearer = HTTPBearer(auto_error=False)


def register_pdf_font() -> str:
    if pdfmetrics is None or TTFont is None:
        raise HTTPException(status_code=503, detail="PDF generator is not installed")

    font_name = "AxesSans"
    if font_name in pdfmetrics.getRegisteredFontNames():
        return font_name

    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]

    for item in candidates:
        if Path(item).exists():
            pdfmetrics.registerFont(TTFont(font_name, item))
            return font_name

    return "Helvetica"


DOC_TEXT = {
    "ru": {
        "project_client": "проект клиента",
        "nda_title": "Соглашение о неразглашении (NDA)",
        "contract_title": "Договор на оказание услуг",
        "date": "Дата формирования: {date}",
        "client": "Клиент",
        "bin": "БИН/ИИН",
        "address": "Адрес",
        "signer": "Подписант",
        "project": "Проект",
        "model": "Модель",
        "estimate": "Оценка",
        "not_specified": "не указан",
        "not_selected": "не выбран",
        "to_agree": "будет согласована",
        "executor": "Реквизиты исполнителя: Axes Solutions, Алматы, Казахстан, hello@axessolution.com.",
        "watermark": "Водяной знак: документ сформирован автоматически в кабинете клиента Axes Solutions.",
        "nda_lines": [
            "Стороны обязуются сохранять конфиденциальность коммерческой, технической, финансовой и иной информации, полученной в рамках переговоров и выполнения проекта.",
            "Конфиденциальная информация используется только для оценки, планирования и исполнения работ. Передача третьим лицам допускается только по письменному согласию раскрывающей стороны.",
            "Обязательство о неразглашении действует в течение трех лет после завершения сотрудничества, если стороны письменно не согласуют иной срок.",
            "Документ является типовой заготовкой и требует финального юридического согласования перед подписанием.",
        ],
        "contract_lines": [
            "Исполнитель оказывает услуги по аутсорсингу/аутстаффингу для проекта: {project}. Конкретный состав работ, сроки и состав команды фиксируются в приложении или техническом задании.",
            "Стоимость определяется по выбранной модели сотрудничества, квалификации специалистов, длительности проекта и согласованному объему работ.",
            "Клиент получает доступ к кабинету проекта, где отображаются спринты, задачи, плановые и фактические часы, а также актуальный статус выполнения.",
            "Стороны подтверждают, что типовой договор формируется автоматически и используется как черновик для дальнейшего согласования.",
        ],
    },
    "kz": {
        "project_client": "клиент жобасы",
        "nda_title": "Құпиялылық туралы келісім (NDA)",
        "contract_title": "Қызмет көрсету шарты",
        "date": "Қалыптастырылған күні: {date}",
        "client": "Клиент",
        "bin": "БСН/ЖСН",
        "address": "Мекенжай",
        "signer": "Қол қоюшы",
        "project": "Жоба",
        "model": "Модель",
        "estimate": "Бағалау",
        "not_specified": "көрсетілмеген",
        "not_selected": "таңдалмаған",
        "to_agree": "келісіледі",
        "executor": "Орындаушы деректемелері: Axes Solutions, Алматы, Қазақстан, hello@axessolution.com.",
        "watermark": "Сутаңба: құжат Axes Solutions клиент кабинетінде автоматты түрде қалыптастырылды.",
        "nda_lines": [
            "Тараптар келіссөздер мен жобаны орындау аясында алынған коммерциялық, техникалық, қаржылық және өзге ақпараттың құпиялылығын сақтауға міндеттенеді.",
            "Құпия ақпарат тек бағалау, жоспарлау және жұмыстарды орындау үшін пайдаланылады. Үшінші тұлғаларға беру ашатын тараптың жазбаша келісімімен ғана мүмкін.",
            "Құпиялылық міндеттемесі ынтымақтастық аяқталғаннан кейін үш жыл бойы қолданылады, егер тараптар жазбаша түрде басқа мерзімді келіспесе.",
            "Құжат типтік жоба болып табылады және қол қою алдында финалдық заңдық келісуді қажет етеді.",
        ],
        "contract_lines": [
            "Орындаушы {project} жобасы үшін аутсорсинг/аутстаффинг қызметтерін көрсетеді. Жұмыс құрамы, мерзімдер және команда құрамы қосымшада немесе техникалық тапсырмада бекітіледі.",
            "Құны таңдалған ынтымақтастық моделіне, мамандар біліктілігіне, жоба ұзақтығына және келісілген жұмыс көлеміне қарай анықталады.",
            "Клиент жоба кабинетіне қол жеткізеді, онда спринттер, міндеттер, жоспарлы және нақты сағаттар, сондай-ақ орындалу статусы көрсетіледі.",
            "Тараптар типтік шарт автоматты түрде қалыптастырылып, әрі қарай келісу үшін черновик ретінде пайдаланылатынын растайды.",
        ],
    },
    "en": {
        "project_client": "client project",
        "nda_title": "Non-disclosure agreement (NDA)",
        "contract_title": "Services agreement",
        "date": "Generated on: {date}",
        "client": "Client",
        "bin": "BIN/IIN",
        "address": "Address",
        "signer": "Signer",
        "project": "Project",
        "model": "Model",
        "estimate": "Estimate",
        "not_specified": "not specified",
        "not_selected": "not selected",
        "to_agree": "to be agreed",
        "executor": "Contractor details: Axes Solutions, Almaty, Kazakhstan, hello@axessolution.com.",
        "watermark": "Watermark: this document was generated automatically in the Axes Solutions client account.",
        "nda_lines": [
            "The parties agree to keep confidential all commercial, technical, financial, and other information received during negotiations and project delivery.",
            "Confidential information may be used only for evaluation, planning, and execution of work. Disclosure to third parties is allowed only with written consent from the disclosing party.",
            "The non-disclosure obligation remains valid for three years after cooperation ends, unless the parties agree otherwise in writing.",
            "This document is a standard draft and requires final legal review before signing.",
        ],
        "contract_lines": [
            "The contractor provides outsourcing/outstaffing services for the project: {project}. The specific scope, timeline, and team composition are fixed in an appendix or statement of work.",
            "The price is determined by the selected collaboration model, specialist qualifications, project duration, and agreed scope of work.",
            "The client receives access to the project account, where sprints, tasks, planned and actual hours, and the current delivery status are shown.",
            "The parties confirm that this standard agreement is generated automatically and used as a draft for further approval.",
        ],
    },
}


def doc_text(lang: str, key: str, **values: Any) -> str:
    text = DOC_TEXT.get(lang, DOC_TEXT["ru"]).get(key, DOC_TEXT["ru"][key])
    return text.format(**values) if values else text


def document_lines(doc_type: str, project: Optional[SmartProject], lang: str) -> List[str]:
    project_title = project.title if project else doc_text(lang, "project_client")
    if doc_type == "nda":
        return list(DOC_TEXT.get(lang, DOC_TEXT["ru"])["nda_lines"])

    return [
        item.format(project=project_title)
        for item in DOC_TEXT.get(lang, DOC_TEXT["ru"])["contract_lines"]
    ]


def build_document_pdf(data: DocumentGenerateIn, user: User, project: Optional[SmartProject]) -> bytes:
    if SimpleDocTemplate is None:
        raise HTTPException(status_code=503, detail="PDF generator is not installed")

    font_name = register_pdf_font()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="AxesTitle", parent=styles["Title"], fontName=font_name, fontSize=18, leading=23, spaceAfter=12))
    styles.add(ParagraphStyle(name="AxesBody", parent=styles["BodyText"], fontName=font_name, fontSize=10.5, leading=15, spaceAfter=9))
    styles.add(ParagraphStyle(name="AxesSmall", parent=styles["BodyText"], fontName=font_name, fontSize=8.5, leading=12, textColor=colors.HexColor("#5f6b7a")))

    lang = data.lang if data.lang in DOC_TEXT else "ru"
    doc_title = doc_text(lang, "nda_title") if data.doc_type == "nda" else doc_text(lang, "contract_title")
    project_payload = parse_details(project.payload) if project else {}
    analysis = project_payload.get("analysis", {}) if isinstance(project_payload.get("analysis"), dict) else {}
    calculation = analysis.get("calculation", {}) if isinstance(analysis.get("calculation"), dict) else {}

    rows = [
        [doc_text(lang, "client"), data.company],
        [doc_text(lang, "bin"), data.bin or doc_text(lang, "not_specified")],
        [doc_text(lang, "address"), data.address or doc_text(lang, "not_specified")],
        [doc_text(lang, "signer"), data.director or doc_text(lang, "not_specified")],
        ["Email", str(data.contact_email or user.email)],
        [doc_text(lang, "project"), project.title if project else doc_text(lang, "not_selected")],
        [doc_text(lang, "model"), calculation.get("modelLabel") or doc_text(lang, "to_agree")],
        [doc_text(lang, "estimate"), calculation.get("outsourcingLabel") or doc_text(lang, "to_agree")],
    ]

    story = [
        Paragraph(escape(doc_title), styles["AxesTitle"]),
        Paragraph(doc_text(lang, "date", date=datetime.now(timezone.utc).strftime("%d.%m.%Y")), styles["AxesSmall"]),
        Spacer(1, 6 * mm),
        Table(
            [[Paragraph(f"<b>{escape(str(left))}</b>", styles["AxesBody"]), Paragraph(escape(str(right)), styles["AxesBody"])] for left, right in rows],
            colWidths=[38 * mm, 118 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef2ff")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]),
        ),
        Spacer(1, 8 * mm),
    ]

    for index, line in enumerate(document_lines(data.doc_type, project, lang), start=1):
        story.append(Paragraph(f"<b>{index}.</b> {escape(line)}", styles["AxesBody"]))

    story.extend([
        Spacer(1, 8 * mm),
        Paragraph(doc_text(lang, "executor"), styles["AxesBody"]),
        Paragraph(doc_text(lang, "watermark"), styles["AxesSmall"]),
    ])

    def draw_watermark(canvas, _doc):
        canvas.saveState()
        canvas.setFont(font_name, 34)
        canvas.setFillColor(colors.Color(0.42, 0.48, 0.62, alpha=0.13))
        canvas.translate(105 * mm, 150 * mm)
        canvas.rotate(36)
        canvas.drawCentredString(0, 0, "AXES SOLUTIONS")
        canvas.setFont(font_name, 15)
        canvas.drawCentredString(0, -17 * mm, "DRAFT DOCUMENT")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_watermark, onLaterPages=draw_watermark)
    return buffer.getvalue()


def require_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
        token_role = normalize_role(payload.get("role") or "")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    normalized_role = normalize_role(user.role)
    if user.role != normalized_role:
        user.role = normalized_role
        db.commit()

    if token_role != normalized_role:
        raise HTTPException(status_code=401, detail="Token role is outdated")

    return user


def require_roles(*roles: str) -> Callable:
    allowed = {normalize_role(role) for role in roles}

    def dependency(user: User = Depends(require_user)) -> User:
        if normalize_role(user.role) not in allowed:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user

    return dependency


app = FastAPI(title="Axes Solutions API")
api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    return {"status": "ok", "service": "axes-solutions"}


@api.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return {
        "token": create_token(user),
        "email": user.email,
        "role": normalize_role(user.role),
        "name": user.name or "",
        "company": user.company or "",
    }


@api.post("/auth/register", response_model=TokenOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role="user",
        name=data.name.strip(),
        company=(data.company or "").strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "token": create_token(user),
        "email": user.email,
        "role": normalize_role(user.role),
        "name": user.name or "",
        "company": user.company or "",
    }


@api.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(require_user)):
    return serialize_user(user)


@api.get("/users", response_model=List[UserOut])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [serialize_user(user) for user in users]


@api.get("/specialists", response_model=List[SpecialistOut])
def get_specialists(db: Session = Depends(get_db)):
    items = db.query(Specialist).order_by(Specialist.service.asc(), Specialist.rating_x10.desc()).all()
    return [serialize_specialist(item) for item in items]


@api.post("/ai/recommend-specialist", response_model=SpecialistRecommendationOut)
def recommend_specialist(data: RequestIn, db: Session = Depends(get_db)):
    recommendation = recommend_specialist_for_request(data, db)
    if not recommendation:
        raise HTTPException(status_code=404, detail="No specialists available")
    return recommendation


@api.get("/admin/stats", response_model=AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    projects = db.query(SmartProject).all()
    active_requests = (
        db.query(ServiceRequest)
        .filter(ServiceRequest.status.in_(["new", "in_progress", "review"]))
        .count()
    )
    completed_tasks = 0
    for project in projects:
        payload = parse_details(project.payload)
        tasks = payload.get("tasks") if isinstance(payload.get("tasks"), list) else []
        completed_tasks += sum(1 for task in tasks if isinstance(task, dict) and task.get("status") == "done")

    specialists = db.query(Specialist).all()
    avg_rating = 0.0
    if specialists:
        avg_rating = round(sum((item.rating_x10 or 0) / 10 for item in specialists) / len(specialists), 1)

    return {
        "projects_total": len(projects),
        "active_requests": active_requests,
        "completed_tasks": completed_tasks,
        "specialists_total": len(specialists),
        "average_specialist_rating": avg_rating,
        "users_total": db.query(User).count(),
    }


@api.post("/requests", response_model=RequestOut)
def create_request(data: RequestIn, db: Session = Depends(get_db)):
    ai = estimate_request(data)
    details = dict(data.details or {})
    recommendation = recommend_specialist_for_request(data, db)
    if recommendation:
        details["recommendedSpecialist"] = recommendation

    req = ServiceRequest(
        company=data.company,
        email=data.email,
        phone=(data.phone or "").strip(),
        title=(data.title or "").strip(),
        service=data.service,
        message=data.message,
        priority=data.priority or "normal",
        budget=(data.budget or "").strip(),
        deadline=(data.deadline or "").strip(),
        tags=json.dumps(data.tags or [], ensure_ascii=False),
        details=json.dumps(details, ensure_ascii=False),
        summary=(data.summary or "").strip(),
        estimate=(data.estimate or ai["estimate"]).strip(),
        complexity=(data.complexity or ai["complexity"]).strip(),
        status="new",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return serialize_request(req)


@api.get("/requests", response_model=List[RequestOut])
def get_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    items = db.query(ServiceRequest).order_by(ServiceRequest.created_at.desc()).all()
    return [serialize_request(item) for item in items]


@api.get("/account/requests", response_model=List[RequestOut])
def get_account_requests(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("user", "admin"))
):
    query = db.query(ServiceRequest)
    if normalize_role(user.role) == "user":
        query = query.filter(ServiceRequest.email == user.email)

    items = query.order_by(ServiceRequest.created_at.desc()).all()
    return [serialize_request(item) for item in items]


@api.patch("/requests/{request_id}/status", response_model=RequestOut)
def update_request_status(
    request_id: str,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    if data.status not in REQUEST_STATUSES:
        raise HTTPException(status_code=400, detail="Unknown request status")

    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = data.status
    db.commit()
    db.refresh(req)
    return serialize_request(req)


@api.delete("/requests/{request_id}")
def delete_request(
    request_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    db.delete(req)
    db.commit()
    return {"status": "ok"}


@api.post("/projects", response_model=ProjectOut)
def create_project(data: ProjectIn, db: Session = Depends(get_db)):
    if data.status not in PROJECT_STATUSES:
        raise HTTPException(status_code=400, detail="Unknown project status")

    project = SmartProject(
        request_id=data.request_id or "",
        title=data.title.strip(),
        company=(data.company or "").strip(),
        email=str(data.email or ""),
        service=data.service,
        status=data.status,
        payload=json.dumps(data.payload, ensure_ascii=False),
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    if project.request_id:
        req = db.query(ServiceRequest).filter(ServiceRequest.id == project.request_id).first()
        if req:
            req.project_id = project.id
            db.commit()

    return serialize_project(project)


@api.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(SmartProject).filter(SmartProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return serialize_project(project)


@api.get("/projects", response_model=List[ProjectOut])
def get_projects(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    items = db.query(SmartProject).order_by(SmartProject.updated_at.desc()).limit(30).all()
    return [serialize_project(item) for item in items]


@api.get("/account/projects", response_model=List[ProjectOut])
def get_account_projects(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("user", "admin"))
):
    query = db.query(SmartProject)
    if normalize_role(user.role) == "user":
        query = query.filter(SmartProject.email == user.email)

    items = query.order_by(SmartProject.updated_at.desc()).all()
    return [serialize_project(item) for item in items]


@api.post("/account/documents")
def generate_account_document(
    data: DocumentGenerateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("user", "admin"))
):
    project = None
    if data.project_id:
        project = db.query(SmartProject).filter(SmartProject.id == data.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if normalize_role(user.role) == "user" and project.email != user.email:
            raise HTTPException(status_code=403, detail="Project is not available for this account")

    pdf = build_document_pdf(data, user, project)
    filename = "axes-nda.pdf" if data.doc_type == "nda" else "axes-contract.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@api.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    project = db.query(SmartProject).filter(SmartProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.status is not None:
        if data.status not in PROJECT_STATUSES:
            raise HTTPException(status_code=400, detail="Unknown project status")
        project.status = data.status

    if data.title is not None:
        project.title = data.title.strip()
    if data.company is not None:
        project.company = data.company.strip()
    if data.email is not None:
        project.email = str(data.email)
    if data.service is not None:
        project.service = data.service
    if data.payload is not None:
        project.payload = json.dumps(data.payload, ensure_ascii=False)

    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@api.post("/reviews")
def create_review(data: ReviewIn, db: Session = Depends(get_db)):
    review = Review(
        name=data.name,
        company=data.company or "",
        rating=data.rating,
        text=data.text,
        approved=0,
    )
    db.add(review)
    db.commit()
    return {"status": "ok", "message": "Review is waiting for moderation"}


@api.get("/reviews", response_model=List[ReviewOut])
def get_reviews(db: Session = Depends(get_db)):
    items = (
        db.query(Review)
        .filter(Review.approved == 1)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [serialize_review(item) for item in items]


@api.get("/admin/reviews", response_model=List[ReviewOut])
def get_admin_reviews(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    items = db.query(Review).order_by(Review.created_at.desc()).all()
    return [serialize_review(item) for item in items]


@api.patch("/reviews/{review_id}/approve", response_model=ReviewOut)
def set_review_approval(
    review_id: str,
    data: ReviewApproval,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    review.approved = 1 if data.approved else 0
    db.commit()
    db.refresh(review)
    return serialize_review(review)


@api.delete("/reviews/{review_id}")
def delete_review(
    review_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()
    return {"status": "ok"}


@api.post("/chat/start", response_model=ChatSessionOut)
def start_chat(data: ChatStartIn, db: Session = Depends(get_db)):
    session = get_or_create_chat_session(db, data)
    return serialize_chat_session(session, db)


@api.get("/chat/{client_id}/messages", response_model=List[ChatMessageOut])
def get_client_chat_messages(client_id: str, db: Session = Depends(get_db)):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.client_id == client_id, ChatSession.status == "open")
        .order_by(ChatSession.updated_at.desc())
        .first()
    )

    if not session:
        return []

    items = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [serialize_chat_message(item) for item in items]


@api.post("/chat/message", response_model=ChatMessageOut)
def send_client_chat_message(data: ChatMessageIn, db: Session = Depends(get_db)):
    session = get_or_create_chat_session(
        db,
        ChatStartIn(client_id=data.client_id),
    )
    message = ChatMessage(
        session_id=session.id,
        sender="client",
        text=data.text.strip(),
    )
    session.updated_at = datetime.now(timezone.utc)
    db.add(message)
    db.commit()
    db.refresh(message)
    return serialize_chat_message(message)


@api.get("/admin/chat/sessions", response_model=List[ChatSessionOut])
def get_admin_chat_sessions(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return [serialize_chat_session(item, db) for item in sessions]


@api.get("/admin/chat/{session_id}/messages", response_model=List[ChatMessageOut])
def get_admin_chat_messages(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    items = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [serialize_chat_message(item) for item in items]


@api.post("/admin/chat/{session_id}/message", response_model=ChatMessageOut)
def send_admin_chat_message(
    session_id: str,
    data: AdminChatMessageIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    message = ChatMessage(
        session_id=session.id,
        sender="admin",
        text=data.text.strip(),
    )
    session.updated_at = datetime.now(timezone.utc)
    db.add(message)
    db.commit()
    db.refresh(message)
    return serialize_chat_message(message)


@api.patch("/admin/chat/{session_id}/close", response_model=ChatSessionOut)
def close_admin_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session.status = "closed"
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return serialize_chat_session(session, db)


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
