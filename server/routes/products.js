const router = require('express').Router();
const c = require('../controllers/productController');
const { authRequired } = require('../middleware/auth');

router.get('/', c.listActive);
router.get('/all', authRequired, c.listAll);
router.get('/:id', c.getOne);
router.post('/', authRequired, c.create);
router.put('/:id', authRequired, c.update);
router.patch('/:id/stock', authRequired, c.updateStock);
router.delete('/:id', authRequired, c.remove);

module.exports = router;
