from piccolo.engine.sqlite import SQLiteEngine
import os

os.makedirs("instance", exist_ok=True)

DB = SQLiteEngine(path="instance/todo.sqlite")
