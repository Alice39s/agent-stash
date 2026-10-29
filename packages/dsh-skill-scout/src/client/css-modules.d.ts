/** CSS Module 的默认导出：本地类名到编译后类名的映射。 */
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
