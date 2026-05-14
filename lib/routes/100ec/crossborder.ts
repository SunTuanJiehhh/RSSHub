import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/crossborder',
    categories: ['new-media'],
    example: '/100ec/crossborder',
    url: 'www.100ec.cn/crossBorder/',
    name: '跨境电商台',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

const HW_CHECK = '9a3fc833d1d8f6aaf8cbedb13affbdb0';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Cookie: `HW_CHECK=${HW_CHECK}`,
    Referer: 'https://www.100ec.cn/crossBorder/',
};

async function handler() {
    const apiUrl = 'https://www.100ec.cn/searchjsona.html';
    const rootUrl = 'https://www.100ec.cn';

    const listUrl = `${apiUrl}?p=1&n=20&terms=${encodeURIComponent('跨境')}`;

    const { data: response } = await got(listUrl, { headers });

    const list = (response.list || []).map((item) => ({
        title: item.title,
        link: `${rootUrl}/detail--${item.id}.html`,
        pubDate: parseDate(item.post_date),
    }));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: detailResponse } = await got(item.link, { headers });

                const $detail = load(detailResponse);

                const titleText = $detail('title').text().split('网经社')[0].trim();
                if (titleText) {
                    item.title = titleText;
                }

                item.description = $detail('.text.clearfix').html() || $detail('.text').html() || '';

                const sourceText = $detail('.title_detail').text() || '';
                const dateMatch = sourceText.match(/发布时间[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日\s\d{2}:\d{2}:\d{2})/);
                if (dateMatch) {
                    item.pubDate = parseDate(dateMatch[1], 'YYYY年MM月DD日 HH:mm:ss');
                }

                const authorMatch = sourceText.match(/来源[：:]\s*([^发\s<][^<]{0,30}?)(?:发布时间|\s*$)/);
                if (authorMatch) {
                    item.author = authorMatch[1].trim();
                }

                return item;
            })
        )
    );

    return {
        title: '网经社 - 跨境电商台',
        link: `${rootUrl}/crossBorder/`,
        item: items,
    };
}
