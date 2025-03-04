import { handler } from '../../misc/requests';
import { ServiceType } from '../../services/constants';

export default handler().post(async (req, res) => {
  const server = global.app.service.get(ServiceType.Server);

  const { queue_type } = req.body;

  return server
    .clear_queue({
      queue_type: queue_type as number,
    })
    .then((r) => {
      res.status(200).json(r);
    });
});
