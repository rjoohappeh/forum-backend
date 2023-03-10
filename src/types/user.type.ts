export type CreateUserDto = {
  email: string;
  hash: string;
  displayName: string;
};

export type UpdateUserDto = {
  email?: string;
  hash?: string;
  hashedRt?: string;
  active?: boolean;
};

export type UserWhereUniqueOptions = {
  id?: number;
  email?: string;
};
