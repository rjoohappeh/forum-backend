export type CreateUserDto = {
  email: string;
  hash: string;
};

export type UpdateUserDto = {
  email?: string;
  hash?: string;
  hashedRt?: string;
  active?: boolean;
};

export type UpdateUserWhereUniqueOptions = {
  id?: number;
  email?: string;
};
