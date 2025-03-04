import FileType from 'file-type';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import { Readable } from 'stream';

import { handler } from '../../../misc/requests';
import {
  ITEM_THUMB_STATIC_FOLDER,
  PAGE_STATIC_FOLDER,
  THUMB_STATIC_FOLDER,
} from '../../../services/constants';
import { getPixie } from '../../../services/pixie';

// THIS IS SPECIFIC TO WHEN THE WEBSERVER IS STARTED BY HPX SERVER

const errTxt = "Momo didn't find anything!";

async function imageFromPath(path_type, req, res) {
  const { t, p1, p2, p3, it } = req.query;

  if (t && p1 && p2 && p3) {
    let p: string;

    if (path_type === 'page') {
      p = PAGE_STATIC_FOLDER;
    } else if (t === 'ti' && it) {
      p = path.join(ITEM_THUMB_STATIC_FOLDER, sanitize(it as string));
    } else {
      p = THUMB_STATIC_FOLDER;
    }

    p = path.join(
      p,
      sanitize(p1 as string),
      sanitize(p2 as string),
      sanitize(p3 as string)
    );

    if (!existsSync(p)) {
      return res.status(404).end(errTxt);
    }
    const type = await FileType.fromFile(p);
    const s = createReadStream(p);
    s.on('open', function () {
      res.setHeader('Content-Type', type?.mime ? type?.mime : '');
      s.pipe(res);
    });
    s.on('error', function () {
      return res.status(404).end(errTxt);
    });
  } else {
    return res.status(404).end(errTxt);
  }
}

export function createImageHandler(path_type: string) {
  return handler().get(async (req, res) => {
    const { t, ...rest } = req.query;

    if (t && Object.keys(rest ?? {}).length) {
      if (t === 'g') {
        const pixie = await getPixie();
        try {
          const b = await pixie.image({ ...(rest as any) });
          if (b.data && Buffer.isBuffer(b.data)) {
            const type = await FileType.fromBuffer(b.data);
            const s = new Readable();
            s.push(b.data);
            s.push(null);
            s.on('error', function () {
              return res.status(404).end(errTxt);
            });
            res.setHeader('Content-Type', type?.mime ? type?.mime : '');
            s.pipe(res);
          } else {
            global.app.log.w(b?.data);
            return res.status(404).end(errTxt);
          }
        } catch (err) {
          global.app.log.w('Error on', req.url, err);
          return res.status(404).end(errTxt);
        }
      } else {
        return await imageFromPath(path_type, req, res);
      }
    } else {
      return res.status(404).end(errTxt);
    }
  });
}

export default handler();
