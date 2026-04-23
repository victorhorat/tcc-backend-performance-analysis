from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "postgresql+asyncpg://user_tcc:password_tcc@localhost:5432/telemetry_db"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=40,
    max_overflow=50,
    pool_timeout=60,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()
