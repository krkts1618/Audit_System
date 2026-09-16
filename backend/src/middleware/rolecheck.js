const rolecheck = (...allowedRoles) => {
  return (req, res, next) => {
    const userIn = allowedRoles.find((role) => req.user.role === role);
    if (!userIn) {
      return res
        .status(403)
        .json({ message: "You are not allowed to access this route" });
    }
    next();
  };
};
