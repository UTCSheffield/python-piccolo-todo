from typing import Any, Optional

from piccolo.columns import Column
from piccolo_api.crud.exceptions import MalformedQuery
from piccolo_api.crud.endpoints import ParamException, PiccoloCRUD
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from auth_helpers import get_authenticated_user


class OwnedPiccoloCRUD(PiccoloCRUD):
    """
    A PiccoloCRUD router which scopes all row access to the authenticated user.

    This keeps the generic CRUD style while enforcing row-level ownership.
    """

    def __init__(self, table, owner_column: Column, **kwargs):
        super().__init__(table=table, **kwargs)
        self.owner_column = owner_column
        self.owner_column_name = owner_column._meta.name

    async def _require_owner_id(self, request: Request) -> int:
        user = await get_authenticated_user(request)
        if not user:
            raise ValueError("Not authenticated")
        return user.id

    async def get_all(
        self, request: Request, params: Optional[dict[str, Any]] = None
    ) -> Response:
        try:
            owner_id = await self._require_owner_id(request)
        except ValueError:
            return Response("Not authenticated", status_code=401)

        scoped_params = dict(params or {})
        scoped_params[self.owner_column_name] = owner_id
        return await super().get_all(request=request, params=scoped_params)

    async def get_count(self, request: Request) -> Response:
        try:
            owner_id = await self._require_owner_id(request)
        except ValueError:
            return Response("Not authenticated", status_code=401)

        params = self._parse_params(request.query_params)
        params[self.owner_column_name] = owner_id

        try:
            split_params = self._split_params(params)
        except ParamException as exception:
            return Response(str(exception), status_code=400)

        try:
            query = self._apply_filters(self.table.count(), split_params)
        except MalformedQuery as exception:
            return Response(str(exception), status_code=400)

        count = await query.run()
        return JSONResponse({"count": count, "page_size": self.page_size})

    async def get_ids(self, request: Request) -> Response:
        try:
            owner_id = await self._require_owner_id(request)
        except ValueError:
            return Response("Not authenticated", status_code=401)

        readable = self.table.get_readable()
        query = self.table.select().columns(
            self.table._meta.primary_key._meta.name, readable
        )
        query = query.where(self.owner_column == owner_id)

        values = await query.run()
        primary_key = self.table._meta.primary_key

        if primary_key.value_type not in (int, str):
            return JSONResponse(
                {str(i[primary_key._meta.name]): i["readable"] for i in values}
            )

        return JSONResponse({i[primary_key._meta.name]: i["readable"] for i in values})

    async def detail(self, request: Request) -> Response:
        try:
            owner_id = await self._require_owner_id(request)
        except ValueError:
            return Response("Not authenticated", status_code=401)

        row_id = request.path_params.get("row_id", None)
        if row_id is None:
            return Response("Missing ID parameter.", status_code=404)

        try:
            row_id = self.table._meta.primary_key.value_type(row_id)
        except ValueError:
            return Response("The ID is invalid", status_code=400)

        exists_for_owner = (
            await self.table.exists()
            .where(
                (self.table._meta.primary_key == row_id)
                & (self.owner_column == owner_id)
            )
            .run()
        )
        if not exists_for_owner:
            return Response("The resource doesn't exist", status_code=404)

        if (type(row_id) is int) and row_id < 1:
            return Response("The resource ID must be greater than 0", status_code=400)

        if request.method == "GET":
            return await self.get_single(request, row_id)
        if request.method == "PUT":
            data = await request.json()
            data[self.owner_column_name] = owner_id
            return await self.put_single(request, row_id, data)
        if request.method == "PATCH":
            data = await request.json()
            data[self.owner_column_name] = owner_id
            return await self.patch_single(request, row_id, data)
        if request.method == "DELETE":
            return await self.delete_single(request, row_id)

        return Response(status_code=405)

    async def post_single(self, request: Request, data: dict[str, Any]) -> Response:
        try:
            owner_id = await self._require_owner_id(request)
        except ValueError:
            return Response("Not authenticated", status_code=401)

        data = dict(data)
        data[self.owner_column_name] = owner_id
        return await super().post_single(request, data)
