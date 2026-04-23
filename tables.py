from piccolo.columns import Boolean, ForeignKey, Varchar
from piccolo.columns.readable import Readable
from piccolo.table import Table
from piccolo.apps.user.tables import BaseUser


class Category(Table):
    name = Varchar(length=50, required=True, unique=True)

    @classmethod
    def get_readable(cls):
        return Readable(template="%s", columns=[cls.name])


class Todo(Table):
    task = Varchar(length=200, required=True)
    user = ForeignKey(references=BaseUser, null=False)
    category = ForeignKey(references=Category, null=False, help_text="Select a category")
    done = Boolean(default=False)
