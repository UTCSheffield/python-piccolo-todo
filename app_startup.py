import os

from piccolo.apps.user.tables import BaseUser
from piccolo_api.session_auth.tables import SessionsBase

from tables import Category, Todo


async def ensure_env_superuser() -> None:
    admin_username = (os.getenv("ADMIN_USERNAME") or "").strip()
    admin_password = os.getenv("ADMIN_PASSWORD") or ""
    admin_email = (os.getenv("ADMIN_EMAIL") or "").strip() or None

    superuser_exists = await BaseUser.exists().where(BaseUser.superuser == True)
    if superuser_exists:
        return

    if not admin_username or not admin_password:
        print(
            "No superuser exists. Set ADMIN_USERNAME and ADMIN_PASSWORD to bootstrap one at startup."
        )
        return

    await BaseUser.create_user(
        username=admin_username,
        password=admin_password,
        email=admin_email,
        admin=True,
        superuser=True,
        active=True,
    )
    print(f"Bootstrapped superuser '{admin_username}' from environment variables.")


async def initialize_schema_and_seed() -> None:
    await BaseUser.create_table(if_not_exists=True)
    await SessionsBase.create_table(if_not_exists=True)
    await Category.create_table(if_not_exists=True)
    await Todo.create_table(if_not_exists=True)

    await ensure_env_superuser()

    if not await Category.exists().where(Category.name == "Urgent"):
        await Category(name="Urgent").save()

    if not await Category.exists().where(Category.name == "Non-urgent"):
        await Category(name="Non-urgent").save()
