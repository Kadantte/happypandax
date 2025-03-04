import { GetServerSidePropsResult, NextPageContext } from 'next';
import Router, { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  FavoriteArtistsMore,
  FavoriteCollections,
  FavoriteGalleries,
  FavoritePages,
  Favorites,
  FavoriteTagsMore,
  Suggestions,
  TimeCapsuleGalleries,
} from '../components/Favorites';
import GalleryCard, { galleryCardDataFields } from '../components/item/Gallery';
import PageLayout from '../components/layout/Page';
import MainMenu from '../components/Menu';
import { PageTitle } from '../components/Misc';
import { ItemType, ViewType } from '../misc/enums';
import t from '../misc/lang';
import { ServerGallery, ServerItem } from '../misc/types';
import { urlparse, urlstring } from '../misc/utility';
import { ServiceType } from '../services/constants';
import ServerService from '../services/server';

interface PageProps {
  data: Unwrap<ServerService['library']>;
  itemType: ItemType;
  urlQuery: ReturnType<typeof urlparse>;
}

export async function getServerSideProps(
  context: NextPageContext
): Promise<GetServerSidePropsResult<PageProps>> {
  const server = global.app.service.get(ServiceType.Server);

  const urlQuery = urlparse(context.resolvedUrl);

  let itemType = ItemType.Gallery;

  // can't trust user input
  if (urlQuery.query?.t === ItemType.Collection) {
    itemType = ItemType.Collection;
  }

  const group = server.create_group_call();

  const view = urlQuery.query?.view;

  const metatags = {
    trash: false,
    favorite: urlQuery.query?.fav as boolean,
    inbox:
      ViewType.Library === view
        ? false
        : ViewType.Inbox === view
        ? true
        : undefined,
  };

  const data = await server.library<ServerGallery>({
    item_type: itemType,
    metatags,
    page: urlQuery.query?.p as number,
    sort_options: {
      by: urlQuery.query?.sort as number,
      desc: urlQuery.query?.desc as boolean,
    },
    filter_id: urlQuery.query?.filter as number,
    limit: urlQuery.query?.limit as number,
    fields: galleryCardDataFields,
  });

  return {
    props: { data, urlQuery, itemType },
  };
}

export default function Page({ data, urlQuery, itemType }: PageProps) {
  const router = useRouter();

  // TODO: replace with useQuery with initialData?
  const [items, setItems] = useState(data);

  useEffect(() => {
    setItems(data);
  }, [data]);

  const pageHrefTemplate = useMemo(
    () => urlstring(router.asPath, { p: '${page}' }, { encode: false }),
    [router.query]
  );

  const onItemKey = useCallback((item: ServerItem) => item.id, []);

  return (
    <PageLayout
      centered
      menu={useMemo(
        () => (
          <MainMenu></MainMenu>
        ),
        []
      )}>
      <PageTitle title={t`Favorites`} />
      <Favorites />
      <Suggestions />
      <FavoriteArtistsMore />
      <FavoriteTagsMore />
      <FavoriteGalleries />
      <FavoriteCollections />
      <FavoritePages />
      <TimeCapsuleGalleries />
    </PageLayout>
  );
}
