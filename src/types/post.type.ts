export type CreatePostDto = {
  message: string;

  // TODO: add validation for this parameter and pipe the body value into an int
  authorId: number;
};

export type PostWithAuthor = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  message: string;
  authorId: number;
  author: {
    displayName: string;
  };
};
