import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Button, Icon, Label, Popup } from 'semantic-ui-react';

import { ItemActions } from '../../client/actions/item';
import { useLibraryContext } from '../../client/context';
import { useSetupDataState, useUpdateDataState } from '../../client/hooks/item';
import { ItemType } from '../../misc/enums';
import t from '../../misc/lang';
import {
  FieldPath,
  ItemSize,
  ServerGallery,
  ServerItem,
  ServerItemWithMetatags,
} from '../../misc/types';
import { maskText } from '../../misc/utility';
import { AppState } from '../../state';
import {
  FavoriteLabel,
  GroupingNumberLabel,
  LanguageLabel,
  PageCountLabel,
  RatingLabel,
  ReadCountLabel,
  StatusLabel,
} from '../dataview/Common';
import GalleryDataTable from '../dataview/GalleryData';
import {
  ActivityLabel,
  InboxIconLabel,
  ItemCard,
  ItemCardActionContent,
  ItemCardActionContentItem,
  ItemCardContent,
  ItemCardImage,
  ItemLabel,
  ItemMenuLabel,
  ItemMenuLabelItem,
  QueueIconLabel,
  ReadingIconLabel,
  TranslucentLabel,
  UnreadIconLabel,
} from './';
import { AddToQueueButton } from './index';

export type GalleryCardData = DeepPick<
  ServerGallery,
  | 'id'
  | 'preferred_title.name'
  | 'artists.[].id'
  | 'artists.[].preferred_name.name'
  | 'profile'
  | 'number'
  | 'rating'
  | 'metatags.favorite'
  | 'metatags.read'
  | 'metatags.inbox'
  | 'progress.end'
  | 'progress.page.number'
  | 'progress.percent'
  | 'page_count'
  | 'times_read'
  | 'language.code'
  | 'language.name'
  | 'grouping.status.name'
>;

export const galleryCardDataFields: FieldPath<ServerGallery>[] = [
  'artists.preferred_name.name',
  'preferred_title.name',
  'profile',
  'number',
  'times_read',
  'page_count',
  'rating',
  'language.code',
  'language.name',
  'grouping.status.name',
  'progress.end',
  'progress.page.number',
  'progress.percent',
  'metatags.*',
];

export function ReadButton({
  data,
  ...props
}: React.ComponentProps<typeof Button> & { data: { id: number } }) {
  const externalViewer = useRecoilValue(AppState.externalViewer);

  return (
    <Link
      href={useMemo(() => ({ pathname: `/item/gallery/${data?.id}/page/1` }), [
        data,
      ])}
      passHref>
      <Button
        as="a"
        primary
        size="mini"
        onClick={useCallback((e) => {
          if (externalViewer) {
            e.preventDefault();
          }
        }, [])}
        {...props}>
        <Icon className="book open" />
        {t`Read`}
      </Button>
    </Link>
  );
}

export function ContinueButton({
  data,
  ...props
}: React.ComponentProps<typeof Button> & {
  data: DeepPick<GalleryCardData, 'id' | 'progress.page.number'>;
}) {
  return (
    <Link
      href={useMemo(
        () => ({
          pathname: `/item/gallery/${data?.id}/page/${data.progress.page.number}`,
        }),
        [data]
      )}
      passHref>
      <Button as="a" color="orange" size="mini" {...props}>
        <Icon name="play" />
        {t`Continue`}
      </Button>
    </Link>
  );
}

export function SendToLibraryButton({
  data,
  type,
  ...props
}: React.ComponentProps<typeof Button> & {
  data: DeepPick<ServerItemWithMetatags, 'id'>;
  type: ItemType;
}) {
  const { key, setData } = useUpdateDataState();
  const [sent, setSent] = useState(false);

  const onClick = useCallback(
    (e) => {
      e.preventDefault();

      // optimistic update
      setSent(true);

      ItemActions.updateMetatags([data], {
        item_type: type,
        item_id: data.id,
        metatags: { inbox: false },
      }).catch((err) => {
        setSent(false);

        console.error(err);
      });
    },
    [data]
  );

  return (
    <Button size="mini" basic={sent} onClick={onClick} {...props}>
      <Icon name={sent ? 'check' : 'grid layout'} />
      {sent ? t`Sent` : t`Send to Library`}
    </Button>
  );
}

export function GalleryMenu({
  hasProgress,
  read,
  trigger,
}: {
  hasProgress: boolean;
  read: boolean;
  trigger?: React.ComponentProps<typeof ItemMenuLabel>['trigger'];
}) {
  return (
    <ItemMenuLabel trigger={trigger}>
      {!hasProgress && (
        <>
          <ItemMenuLabelItem icon="book open">{t`Read`}</ItemMenuLabelItem>
          <ItemMenuLabelItem icon="book open">{t`Read in new tab`}</ItemMenuLabelItem>
        </>
      )}
      {hasProgress && (
        <ItemMenuLabelItem icon="play">{t`Continue reading`}</ItemMenuLabelItem>
      )}
      <ItemMenuLabelItem icon="plus">{t`Add to queue`}</ItemMenuLabelItem>
      <ItemMenuLabelItem icon="pencil">{t`Edit`}</ItemMenuLabelItem>
      <ItemMenuLabelItem icon="exchange">{t`Show activity`}</ItemMenuLabelItem>
      {!read && (
        <ItemMenuLabelItem icon="eye">{t`Mark as read`}</ItemMenuLabelItem>
      )}
      {read && (
        <ItemMenuLabelItem icon="eye">{t`Mark as unread`}</ItemMenuLabelItem>
      )}
      <ItemMenuLabelItem icon="trash">{t`Delete`}</ItemMenuLabelItem>
    </ItemMenuLabel>
  );
}

export function GalleryCard({
  size,
  data: initialData,
  fluid,
  loading,
  hiddenLabel,
  hiddenAction,
  activity,
  activityContent,
  actionContent,
  draggable = true,
  disableModal,
  details = GalleryDataTable,
  onDetailsOpen,
  horizontal,
}: {
  size?: ItemSize;
  data: GalleryCardData;
  fluid?: boolean;
  hiddenLabel?: boolean;
  hiddenAction?: boolean;
  loading?: boolean;
  activity?: boolean;
  activityContent?: React.ReactNode;
  actionContent?: React.ComponentProps<typeof ItemCard>['actionContent'];
  draggable?: boolean;
  disableModal?: boolean;
  details?: React.ElementType<{ data: PartialExcept<ServerItem, 'id'> }>;
  onDetailsOpen?: () => void;
  horizontal?: boolean;
}) {
  const { data, dataContext } = useSetupDataState({
    initialData,
    itemType: ItemType.Gallery,
    key: '_gallery',
  });

  const isLibraryCtx = useLibraryContext();

  const blur = useRecoilValue(AppState.blur);

  const hasProgress = !!data?.progress && !data?.progress?.end;

  const readingQueue = useRecoilValue(AppState.readingQueue);

  const actions = useCallback(
    () => (
      <ItemCardActionContent>
        {hasProgress && (
          <ItemCardActionContentItem>
            <ContinueButton data={data} />
          </ItemCardActionContentItem>
        )}
        {(!hasProgress || horizontal) && (
          <ItemCardActionContentItem>
            <ReadButton data={data} />
          </ItemCardActionContentItem>
        )}
        {(horizontal ||
          !(['tiny', 'small', 'mini'] as ItemSize[]).includes(size)) && (
          <ItemCardActionContentItem>
            <AddToQueueButton itemType={ItemType.Gallery} data={data} />
          </ItemCardActionContentItem>
        )}
        {isLibraryCtx && data?.metatags?.inbox && (
          <ItemCardActionContentItem>
            <SendToLibraryButton type={ItemType.Gallery} data={data} />
          </ItemCardActionContentItem>
        )}
      </ItemCardActionContent>
    ),
    [data, size, horizontal, isLibraryCtx]
  );

  return (
    <ItemCard
      type={ItemType.Gallery}
      dataContext={dataContext}
      href={`/item/gallery/${data.id}`}
      dragData={data}
      draggable={draggable}
      centered
      hiddenLabel={hiddenLabel}
      hiddenAction={hiddenAction}
      loading={loading}
      activity={activity}
      activityContent={activityContent}
      link
      fluid={fluid}
      horizontal={horizontal}
      size={size}
      details={details}
      detailsData={data}
      disableModal={disableModal}
      onDetailsOpen={onDetailsOpen}
      labels={useMemo(
        () => [
          <ItemLabel key="fav" x="left" y="top">
            <FavoriteLabel
              size={
                (['large', 'medium'] as ItemSize[]).includes(size) || !size
                  ? 'gigantic'
                  : 'massive'
              }
              defaultRating={data?.metatags?.favorite ? 1 : 0}
            />
          </ItemLabel>,
          <ItemLabel key="icons" x="right" y="top">
            {readingQueue?.includes?.(data?.id) && <QueueIconLabel />}
            {!!data?.metatags?.inbox && <InboxIconLabel />}
            {!data?.metatags?.read && !hasProgress && <UnreadIconLabel />}
            {hasProgress && (
              <ReadingIconLabel percent={data?.progress?.percent} />
            )}
            {data?.number !== undefined && data?.number > 0 && (
              <GroupingNumberLabel as={TranslucentLabel}>
                {data?.number}
              </GroupingNumberLabel>
            )}
            <ActivityLabel />
          </ItemLabel>,
          <ItemLabel key="info" x="right" y="bottom">
            {horizontal && (
              <StatusLabel as={TranslucentLabel}>
                {data?.grouping?.status?.name}
              </StatusLabel>
            )}
            {horizontal && (
              <ReadCountLabel as={TranslucentLabel}>
                {data?.times_read}
              </ReadCountLabel>
            )}
            {horizontal && !!data?.language && (
              <LanguageLabel as={TranslucentLabel}>
                {data.language?.code
                  ? data.language.code.toUpperCase?.()
                  : data?.language?.name ?? ''}
              </LanguageLabel>
            )}
            {horizontal && (
              <PageCountLabel as={TranslucentLabel}>
                {data?.page_count}
              </PageCountLabel>
            )}
            {!horizontal && !!data?.language?.code && (
              <TranslucentLabel>
                {data.language.code.toUpperCase()}
              </TranslucentLabel>
            )}
            {!horizontal && (
              <TranslucentLabel circular>{data?.page_count}</TranslucentLabel>
            )}
            <GalleryMenu
              hasProgress={hasProgress}
              read={data?.metatags?.read}
            />
          </ItemLabel>,
          <ItemLabel key="rating" x="left" y="bottom">
            <Popup
              content={<RatingLabel defaultRating={data?.rating} />}
              on="click"
              hideOnScroll
              trigger={
                <Label color="orange" size="large" basic circular>
                  {data?.rating}
                </Label>
              }
            />
          </ItemLabel>,
        ],
        [horizontal, size, hasProgress, data, readingQueue]
      )}
      actionContent={actionContent ?? actions}
      image={useCallback(
        ({ children }: { children?: React.ReactNode }) => (
          <ItemCardImage src={data?.profile}>{children}</ItemCardImage>
        ),
        [data.profile]
      )}>
      <ItemCardContent
        title={data?.preferred_title?.name ?? ''}
        subtitle={data?.artists.map((a) => (
          <span key={a.id}>
            {blur ? maskText(a.preferred_name.name) : a.preferred_name.name}
          </span>
        ))}></ItemCardContent>
    </ItemCard>
  );
}

export default GalleryCard;
