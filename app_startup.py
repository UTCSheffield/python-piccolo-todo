from piccolo.apps.user.tables import BaseUser
from piccolo_api.session_auth.tables import SessionsBase

from tables import Category, Todo


async def initialize_schema_and_seed() -> None:
    await BaseUser.create_table(if_not_exists=True)
    await SessionsBase.create_table(if_not_exists=True)
    await Category.create_table(if_not_exists=True)
    await Todo.create_table(if_not_exists=True)

    if not await Category.exists().where(Category.name == "Urgent"):
        await Category(name="Urgent").save()

    if not await Category.exists().where(Category.name == "Non-urgent"):
        await Category(name="Non-urgent").save()
