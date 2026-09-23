function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

function wrapRouter(router) {
  (router.stack || []).forEach((layer) => {
    if (!layer.route) return;
    layer.route.stack.forEach((handlerLayer) => {
      if (handlerLayer.handle.length >= 4) return;
      handlerLayer.handle = asyncHandler(handlerLayer.handle);
    });
  });
  return router;
}

module.exports = { asyncHandler, wrapRouter };