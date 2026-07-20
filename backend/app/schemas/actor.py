from pydantic import BaseModel, ConfigDict, Field


class ActorAliasRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    alias: str


class ActorManagementRead(BaseModel):
    id: str
    name: str
    is_active: bool
    in_use: bool
    aliases: list[ActorAliasRead]


class ActorAliasCreate(BaseModel):
    alias: str = Field(min_length=1)


class ActorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None
