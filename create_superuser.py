"""
Run this script to create an admin superuser for the Piccolo admin panel.
Usage: python3 create_superuser.py
"""
import asyncio
import getpass

from piccolo.apps.user.tables import BaseUser
from piccolo_api.session_auth.tables import SessionsBase


async def main():
    await BaseUser.create_table(if_not_exists=True)
    await SessionsBase.create_table(if_not_exists=True)

    username = input("Username: ")
    password = getpass.getpass("Password: ")

    existing_user = await BaseUser.objects().where(BaseUser.username == username).first()

    if existing_user:
        await BaseUser.update_password(user=existing_user.id, password=password)
        await BaseUser.update(
            {
                BaseUser.admin: True,
                BaseUser.superuser: True,
                BaseUser.active: True,
            }
        ).where(BaseUser.id == existing_user.id)
        print(f"Superuser '{username}' updated successfully.")
        return

    await BaseUser.create_user(
        username=username,
        password=password,
        admin=True,
        superuser=True,
        active=True,
    )
    print(f"Superuser '{username}' created successfully.")


asyncio.run(main())
