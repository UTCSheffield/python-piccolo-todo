from piccolo.columns import Boolean, ForeignKey, Varchar
from piccolo.table import Table


class Category(Table):
    name = Varchar(length=50, required=True, unique=True)


class Todo(Table):
    task = Varchar(length=200, required=True)
    user_id = Varchar(length=100, required=True)
    category = ForeignKey(references=Category, null=False)
    done = Boolean(default=False)
