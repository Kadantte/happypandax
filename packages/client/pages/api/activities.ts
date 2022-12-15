import { handler } from '../../server/requests';
import { ServiceType } from '../../services/constants';
import { ActivityType } from '../../shared/enums';

export default handler().post(async (req, res) => {
  const server = global.app.service.get(ServiceType.Server);

  const { items, activity_type, __options } = req.body;

  return server
    .activities(
      {
        items: items as Record<string, number[]>,
        activity_type: activity_type as ActivityType,
      },
      undefined,
      __options
    )
    .then((r) => {
      res.status(200).json(r);
    });
});
