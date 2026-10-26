/** 业务冲突错误：请求本身合法，但会话当前的状态不允许这个操作。HTTP 路由把它映射为 409。 */

const CONFLICT_ERROR_NAME = "MessageEditConflict";

/** 创建一个业务冲突错误；消息里写清是哪个会话、哪一处不满足。 */
export function conflictError(message: string, options?: ErrorOptions): Error {
  const error = new Error(message, options);
  error.name = CONFLICT_ERROR_NAME;
  return error;
}

export function isConflictError(error: Error): boolean {
  return error.name === CONFLICT_ERROR_NAME;
}
