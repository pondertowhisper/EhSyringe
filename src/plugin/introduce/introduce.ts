import { EHTNamespaceName, TagItem } from '../../interface';
import { chromeMessage } from '../../tool/chrome-message';
import { config, ConfigData } from '../../tool/config-manage';
import { logger } from '../../tool/log';
import { getEditorUrl, getFullKey } from '../../tool/tool';

import './introduce.less';

class Introduce {
    async init(): Promise<void> {
        const conf = await config.get();
        if (!conf.showIntroduce) return;

        const taglist = document.querySelector('#taglist') as HTMLDivElement;
        this.tagList = taglist;
        const gright = document.querySelector('#gd5');

        if (!(taglist && gright)) return;

        logger.log('标签介绍');
        this.initIntroduceBox();
        gright.insertBefore(this.introduceBox, null);

        taglist.addEventListener('click', this.onclick);
    }

    private initIntroduceBox(): void {
        this.introduceBox = document.createElement('div');
        this.introduceBox.id = 'ehs-introduce-box';
        this.introduceBox.addEventListener('click', (ev) => {
            let target = ev.target as Node | null;

            if (target instanceof HTMLElement && target.classList.contains('ehs-close')) {
                const selectedTag = this.tagList.querySelector('[style*="color"]') as HTMLElement;
                if (selectedTag) {
                    selectedTag.click();
                } else {
                    this.closeIntroduceBox();
                }
                return;
            }

            while (target) {
                if (target.nodeName === 'A' && 'href' in target) break;
                target = target.parentNode;
            }
            if (target) {
                const a = target as HTMLAnchorElement;
                ev.preventDefault();
                window.open(a.href, '_BLANK');
            }
        });
    }

    introduceBox!: HTMLDivElement;
    tagList!: HTMLDivElement;

    target: HTMLAnchorElement | null = null;

    private findTarget(node: Node | null): HTMLAnchorElement | null {
        const isTarget = (n: Node): n is HTMLAnchorElement =>
            n.nodeType === Node.ELEMENT_NODE &&
            n.nodeName === 'A' &&
            (n as HTMLElement).id.startsWith('ta_') &&
            n.parentElement != null &&
            (n.parentElement.classList.contains('gt') ||
                n.parentElement.classList.contains('gtl') ||
                n.parentElement.classList.contains('gtw'));
        while (node) {
            if (isTarget(node)) return node;
            node = node.parentNode;
        }
        return null;
    }

    async openIntroduceBox(namespace: EHTNamespaceName, tag: string, canceled: () => boolean): Promise<void> {
        const timer = logger.time('获取标签介绍');
        const tagData = await chromeMessage.send('get-taglist', getFullKey(namespace, tag));
        timer.log(tagData);
        timer.end();

        if (canceled()) {
            return;
        }
        if (tagData && !Array.isArray(tagData)) {
            // language=HTML
            this.introduceBox.innerHTML = `
            <div class="ehs-title">
                <div>
                    <div class="ehs-cn">${tagData.name}</div>
                    <div class="ehs-en">${tagData.namespace}:${tagData.key}</div>
                </div>
                <span class="ehs-close">×</span>
            </div>
            <div class="ehs-content">
                ${
                    tagData.intro ||
                    `
                <div class="ehs-no-intro">无介绍</div>
                `
                }
            </div>
            <div class="ehs-href">${tagData.links}</div>`;
        } else {
            const editorUrl = getEditorUrl(namespace, tag);
            // language=HTML
            this.introduceBox.innerHTML = `
            <div class="ehs-title">
                <div>
                    <div class="ehs-cn">${namespace}:${tag}</div>
                    <div class="ehs-en">该标签尚未翻译</div>
                </div>
                <span class="ehs-close">×</span>
            </div>
            <div class="ehs-content">
                <div class="ehs-no-translation">
                    <div class="text">
                        该标签尚未翻译
                    </div>
                    <div class="button">
                        <a href="${editorUrl}" target="_blank">提供翻译</a>
                    </div>
                </div>
            </div>`;
        }
    }

    closeIntroduceBox(): void {
        this.introduceBox.innerHTML = '';
    }

    readonly onclick = (e: MouseEvent): void => {
        const target = this.findTarget(e.target as Node);
        if (!target) {
            return;
        }
        this.target = target;
        const isOpen = !!target.style.color;
        if (!isOpen) {
            this.closeIntroduceBox();
            return;
        }
        const m = /'(.*)'/gi.exec(target.getAttribute('onclick') ?? '');
        if (!m?.[1]) return;
        const m2 = m[1].split(':');
        let namespace: EHTNamespaceName = 'misc';
        let tag = '';
        if (m2.length === 1) {
            tag = m2[0];
        } else {
            namespace = m2.shift() as EHTNamespaceName;
            tag = m2.join(':');
        }

        this.openIntroduceBox(namespace, tag, () => this.target !== target).catch(logger.error);
    };
}

export const introduceInit = (): Promise<void> => new Introduce().init();
