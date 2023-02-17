import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
export const GetRequestToken = createParamDecorator(
  (data: undefined, context: ExecutionContext) => {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    if (token) {
      return token.split(' ')[1];
    }
    return null;
  },
);
