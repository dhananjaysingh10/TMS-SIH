from typing import Optional, List
from uuid import uuid4
from datetime import datetime
import logging

# SQLAlchemy Imports
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Text, select, update
from sqlalchemy.engine.url import make_url

# Google ADK Imports
from google.adk.sessions import BaseSessionService, Session


# 1. DEFINE THE TABLE MODEL
class Base(DeclarativeBase):
    pass


class SessionModel(Base):
    __tablename__ = "adk_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    app_name: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    session_data: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# 2. THE ROBUST SERVICE CLASS
class PostgresSessionService(BaseSessionService):
    def __init__(self, db_url: str):
        # --- 1. SANITIZE THE URL ---
        try:
            url_obj = make_url(db_url)

            if "sslmode" in url_obj.query:
                new_query = {k: v for k, v in url_obj.query.items() if k != "sslmode"}
                url_obj = url_obj._replace(query=new_query)

            if url_obj.drivername == "postgresql":
                url_obj = url_obj._replace(drivername="postgresql+asyncpg")

            final_url = url_obj.render_as_string(hide_password=False)

        except Exception as e:
            logging.error(f"⚠️ URL Parsing Failed: {e}. Using raw URL.")
            final_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

        # --- 2. CREATE ENGINE ---
        self.engine = create_async_engine(final_url, echo=False)
        self.async_session = async_sessionmaker(self.engine, expire_on_commit=False)
        self._tables_created = False

    async def _ensure_tables(self):
        """Lazy loading table creation."""
        if self._tables_created:
            return

        try:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            self._tables_created = True
        except Exception as e:
            logging.error(f"❌ Database Connection Failed. Error: {e}")
            raise e

    async def create_session(
        self, app_name: str, user_id: str, session_id: str = None
    ) -> Session:
        await self._ensure_tables()

        final_id = session_id or str(uuid4())

        async with self.async_session() as session:
            stmt = select(SessionModel).where(SessionModel.id == final_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                logging.info(f"🔄 Session {final_id} recovered.")
                return Session(
                    id=existing.id, app_name=existing.app_name, user_id=existing.user_id
                )

            new_session = SessionModel(
                id=final_id, app_name=app_name, user_id=user_id, session_data="{}"
            )
            session.add(new_session)
            await session.commit()

            logging.info(f"✨ Session {final_id} created.")
            return Session(id=final_id, app_name=app_name, user_id=user_id)

    async def get_session(
        self, app_name: str, user_id: str, session_id: str
    ) -> Session:
        await self._ensure_tables()

        async with self.async_session() as session:
            stmt = select(SessionModel).where(SessionModel.id == session_id)
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()

            if not record:
                return await self.create_session(app_name, user_id, session_id)

            return Session(
                id=record.id, app_name=record.app_name, user_id=record.user_id
            )

    async def list_sessions(
        self, app_name: str, user_id: Optional[str] = None
    ) -> List[Session]:
        """
        Retrieves a list of sessions filtered by app_name and optionally user_id.
        Required by BaseSessionService contract.
        """
        await self._ensure_tables()

        async with self.async_session() as session:
            stmt = select(SessionModel).where(SessionModel.app_name == app_name)

            # Apply optional user filter
            if user_id:
                stmt = stmt.where(SessionModel.user_id == user_id)

            result = await session.execute(stmt)
            records = result.scalars().all()

            # Map SQL models back to ADK Session objects
            return [
                Session(id=rec.id, app_name=rec.app_name, user_id=rec.user_id)
                for rec in records
            ]

    async def delete_session(self, session_id: str):
        async with self.async_session() as session:
            stmt = select(SessionModel).where(SessionModel.id == session_id)
            result = await session.execute(stmt)
            to_delete = result.scalar_one_or_none()
            if to_delete:
                await session.delete(to_delete)
                await session.commit()
