import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';

type Character = {
  name: string;
  desktopTitle: string;
  mobileTitle: string;
  text: string;
  tone: string;
};

type TimelineItem = {
  title: string;
  date: string;
  tone: string;
  content: string;
  imgUrl?: string;
};

type HomeContentResponse = {
  characters: Character[];
  timeline: TimelineItem[];
};

// const fallbackCharacters: Character[] = [
//   {
//     name: 'Sonny',
//     desktopTitle: '前...',
//     mobileTitle: 'S',
//     text: '說壞不壞但好不到哪裡去',
//     tone: 'bg-[#ffd400]',
//   },
//   {
//     name: 'Welly',
//     desktopTitle: '現...',
//     mobileTitle: 'W',
//     text: '喊著新創但掌控欲極高',
//     tone: 'bg-[#f2cdc7]',
//   },
//   {
//     name: 'JiaJing',
//     desktopTitle: '課...',
//     mobileTitle: 'J',
//     text: '夾縫中求生存時不時被威脅的',
//     tone: 'bg-[#e4dfab]',
//   },
// ];
 
// const fallbackTimeline: TimelineItem[] = [
//   {
//     title: '調薪＆升遷',
//     date: '2024-01-01',
//     tone: 'bg-[#ffe070]',
//     content:
//       '被擋 晉升請客群組',
//   },
//   {
//     title: '組織異動',
//     date: '2024-03-15',
//     tone: 'bg-[#e7e2d7]',
//     content:
//       '副總無預警被拔掉 Sonny狀態不對 Sonny公布確認離職 一開始以為 Welly 只是代理部長，結果直接變成部長',
//   },
//   {
//     title: '部門未來發展＆離職',
//     date: '2024-06-20',
//     tone: 'bg-[#f4cfc7]',
//     content:
//       '覺得 Web 架構與應用的合作有問題，大概前面開頭都在暗指我們有問題，所有人對部長負責，能力大於職稱，能力與薪水掛鉤，隨時發動 PIP 課長也會被 PIP，懷疑此偷威脅佳菁，部門合併 跨職能 未來發展不妙 前面有一半都在說 web 應用',
//   },
//   {
//     title: '微觀管理',
//     date: '2024-06-20',
//     tone: 'bg-[#f4cfc7]',
//     content:
//       '直接把 sean 的事情排開拉去做訂單頁  直接找yuki 指派不重要的任務',
//   },
// ];

const ROOM_ID = 'demo';
const SYNC_STORAGE_KEY = 'pixel-tales-sync-enabled';

type ServerMessage =
  | {
      type: 'state';
      room: string;
      index: number;
    }
  | {
      type: 'error';
      message: string;
    };

function PixelScene({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden border-[3px] border-[#4b332c] bg-[#bde9c4] shadow-[4px_4px_0_#2f241f] ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#72d2c7_0%,#f4e786_43%,#f2c66b_64%,#193c2e_100%)]" />
      <div className="absolute left-[42%] top-[24%] h-16 w-16 rounded-full bg-[#fff9d9] shadow-[0_0_24px_#fff6bd]" />
      <div className="absolute bottom-0 left-0 h-28 w-2/3 bg-[linear-gradient(145deg,#0f3c2f,#174d38_45%,#0c241f)] [clip-path:polygon(0_42%,100%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-0 right-0 h-36 w-2/3 bg-[linear-gradient(145deg,#2c7a37,#123b2d_56%,#0b241f)] [clip-path:polygon(30%_36%,100%_0,100%_100%,0_100%)]" />
      <div className="absolute left-8 top-20 h-2 w-8 bg-white/80" />
      <div className="absolute right-16 top-14 h-2 w-16 bg-white/80" />
      <div className="absolute right-36 top-28 h-2 w-10 bg-white/80" />
    </div>
  );
}

function PixelIcon({ label, tone }: { label: string; tone: string }) {
  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center border-[3px] border-[#4b332c] ${tone} text-xl font-black text-[#4b332c] shadow-[2px_2px_0_#2f241f] md:h-20 md:w-20`}
    >
      {label}
    </div>
  );
}

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [contentStatus, setContentStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isPresenter, setIsPresenter] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'connecting' | 'connected' | 'offline'>(
    'idle',
  );
  const [lightboxImage, setLightboxImage] = useState<TimelineItem | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const timelineSectionRef = useRef<HTMLElement | null>(null);
  const shouldScrollToTimelineRef = useRef(false);
  const selectedTimeline = timeline[selectedTimelineIndex];

  useEffect(() => {
    setSyncEnabled(sessionStorage.getItem(SYNC_STORAGE_KEY) === 'true');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeContent() {
      try {
        const response = await fetch('/api/home-content', {
          method: 'POST',
        });

        if (!response.ok) {
          setContentStatus('error');
          return;
        }

        const data = (await response.json()) as HomeContentResponse;

        if (cancelled || !data.characters.length || !data.timeline.length) {
          if (!cancelled) {
            setContentStatus('error');
          }
          return;
        }

        setCharacters(data.characters);
        setTimeline(data.timeline);
        setSelectedTimelineIndex((index) => (index < data.timeline.length ? index : 0));
        setContentStatus('ready');
      } catch {
        if (!cancelled) {
          setContentStatus('error');
        }
        return;
      }
    }

    loadHomeContent();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!syncEnabled) {
      socketRef.current?.close();
      socketRef.current = null;
      setSyncStatus('idle');
      return;
    }

    sessionStorage.setItem(SYNC_STORAGE_KEY, 'true');
    setSyncStatus('connecting');

    const params = new URLSearchParams(window.location.search);
    const shouldPresent = params.get('presenter') === '1';
    const presenterKey = params.get('key') || '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    setIsPresenter(shouldPresent);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setSyncStatus('connected');
      socket.send(
        JSON.stringify({
          type: 'hello',
          room: ROOM_ID,
          presenterKey: shouldPresent ? presenterKey : '',
        }),
      );
    });

    socket.addEventListener('message', (event) => {
      let message: ServerMessage;

      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      if (
        message.type === 'state' &&
        message.room === ROOM_ID &&
        Number.isInteger(message.index) &&
        message.index >= 0 &&
        message.index < timeline.length
      ) {
        if (!shouldPresent) {
          shouldScrollToTimelineRef.current = true;
        }

        setSelectedTimelineIndex(message.index);
      }
    });

    socket.addEventListener('close', () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        setSyncStatus('offline');
      }
    });

    socket.addEventListener('error', () => {
      setSyncStatus('offline');
    });

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.close();
    };
  }, [syncEnabled]);

  useEffect(() => {
    if (!shouldScrollToTimelineRef.current) {
      return;
    }

    shouldScrollToTimelineRef.current = false;
    timelineSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedTimelineIndex]);

  useEffect(() => {
    if (!lightboxImage) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxImage]);

  const selectTimeline = useCallback(
    (index: number) => {
      if (syncEnabled && !isPresenter) {
        return;
      }

      setSelectedTimelineIndex(index);

      if (!syncEnabled || !isPresenter || socketRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }

      socketRef.current.send(
        JSON.stringify({
          type: 'selectTimeline',
          room: ROOM_ID,
          index,
        }),
      );
    },
    [isPresenter, syncEnabled],
  );

  const toggleSyncMode = useCallback(() => {
    setSyncEnabled((enabled) => {
      const nextEnabled = !enabled;

      if (nextEnabled) {
        sessionStorage.setItem(SYNC_STORAGE_KEY, 'true');
      } else {
        sessionStorage.removeItem(SYNC_STORAGE_KEY);
      }

      return nextEnabled;
    });
  }, []);

  return (
    <>
      <Head>
        <title>PixelTales Studio</title>
        <meta name="description" content="像素冒險故事集切版頁面" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-[#f7f4ec] text-[#26231f]">
        <header className="border-b-[5px] border-[#4b332c] bg-[#776400] text-white shadow-[0_4px_0_#c6bd78]">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 md:px-16 md:py-4">
            <a className="text-xl font-semibold md:text-5xl" href="#">
              像素冒險故事集
            </a>
          </div>
        </header>

        <div className="sticky top-0 z-30 border-b-[3px] border-[#4b332c] bg-[#f7f4ec]/95 px-4 py-3 backdrop-blur md:px-16">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#5f5a50]">
              {syncEnabled
                ? isPresenter
                  ? '主講同步模式：你的時間線選取會同步給觀眾。'
                  : '同步模式：目前會跟隨主講者的時間線進度。'
                : '一般瀏覽模式：你可以自由查看頁面內容。'}
              {syncEnabled ? (
                <span className="ml-2 text-xs text-[#8b7500]">
                  {syncStatus === 'connected'
                    ? '已連線'
                    : syncStatus === 'connecting'
                      ? '連線中'
                      : '未連線'}
                </span>
              ) : null}
            </p>
            <button
              className={`border-[3px] border-[#4b332c] px-4 py-2 text-sm font-bold shadow-[3px_3px_0_#3d2c24] transition ${
                syncEnabled
                  ? 'bg-[#776400] text-white hover:bg-[#5f5000]'
                  : 'bg-[#ffd400] text-[#776400] hover:bg-[#ffe45b]'
              }`}
              onClick={toggleSyncMode}
              type="button"
            >
              {syncEnabled ? '回到一般瀏覽' : '進入同步模式'}
            </button>
          </div>
        </div>

        <section className="mx-auto max-w-[1280px] px-4 py-7 md:px-16 md:py-16" id="story">
          <div className="relative">
            <PixelScene className="h-[250px] md:h-[280px]" />
            <div className="absolute bottom-8 left-7 right-7 border-[3px] border-[#5b4038] bg-white/90 p-4 shadow-[4px_4px_0_#3d2c24]">
              <h1 className="text-3xl font-black text-[#776400]">歡迎來到像素元宇宙</h1>
              <p className="mt-2 text-base font-medium leading-6 text-[#5f5a50]">
                這是一個充滿驚奇與色彩的 8-bit 世界。跟隨我們的英雄，踏上一場關於勇氣、智慧與友情的不凡旅程。
              </p>
            </div>
          </div>
        </section>

        <section className="border-y-[4px] border-[#6b652d] px-4 py-7 md:px-0 md:py-16">
          <div className="mx-auto max-w-[1280px] md:px-16">
            <h2 className="flex items-center gap-4 text-2xl font-bold md:text-4xl md:font-medium">
              <span className="text-[#8b7500]">§</span>
              <span className="md:hidden">Characters</span>
              <span className="hidden md:inline">故事主角</span>
            </h2>

            <div className="mt-6 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-10">
              {contentStatus === 'loading' ? (
                <p className="text-sm font-semibold text-[#5f5a50]">資料載入中...</p>
              ) : null}
              {contentStatus === 'error' && !characters.length ? (
                <p className="text-sm font-semibold text-[#5f5a50]">
                  目前無法取得故事主角資料。
                </p>
              ) : null}
              {characters.map((character, index) => (
                <article
                  className={`border-[3px] border-[#5b4038] bg-[#f7f4ec] p-4 shadow-[4px_4px_0_#3d2c24] md:min-h-[250px] md:p-8 md:text-center ${
                    index === 0 ? 'md:bg-white' : ''
                  }`}
                  key={character.name}
                >
                  <div className="flex items-center gap-4 md:flex-col md:justify-center md:gap-5">
                    <PixelIcon label={character.name.slice(0, 1)} tone={character.tone} />
                    <div>
                      <h3 className="hidden text-2xl font-bold md:block">
                        {character.desktopTitle}
                      </h3>
                      <h3 className="text-base font-black md:hidden">{character.mobileTitle}</h3>
                      <p className="mt-1 leading-7 text-[#5f5a50] md:block">
                        {character.text}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="scroll-mt-20 border-b-[4px] border-[#6b652d] px-4 py-8 md:px-16 md:py-16"
          id="timeline"
          ref={timelineSectionRef}
        >
          <div className="mx-auto max-w-[1280px]">
            <h2 className="flex items-center gap-4 text-2xl font-bold md:text-4xl md:font-medium">
              <span className="text-[#8b7500]">↺</span>
              冒險回憶錄
            </h2>

            <div className="relative mt-6 flex gap-4 overflow-x-auto pb-4 md:mt-14 md:gap-10">
              <div className="absolute left-10 right-0 top-16 hidden h-1 bg-[#d9d4c8] md:block" />
              {contentStatus === 'loading' ? (
                <p className="text-sm font-semibold text-[#5f5a50]">資料載入中...</p>
              ) : null}
              {contentStatus === 'error' && !timeline.length ? (
                <p className="text-sm font-semibold text-[#5f5a50]">
                  目前無法取得冒險回憶錄資料。
                </p>
              ) : null}
              {timeline.map((item, index) => (
                <article
                  className={`relative z-10 shrink-0 border-[3px] border-[#5b4038] p-5 text-center shadow-[4px_4px_0_#3d2c24] md:w-[300px] md:p-5 lg:w-[360px] ${
                    selectedTimelineIndex === index ? 'bg-[#ffe070]' : 'bg-[#e7e2d7]'
                  } ${syncEnabled && !isPresenter ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  key={item.title}
                  onClick={() => selectTimeline(index)}
                >
                  <h3 className="text-xl font-medium md:mt-6 md:text-2xl">{item.title}</h3>
                  <div>
                    <p className="mt-4 inline-block border-2 border-[#4b332c] bg-[#f7f4ec] px-3 py-1 text-xs font-semibold md:text-sm">
                      {item.date}
                    </p>
                    <button
                      className="mx-auto mt-5 block text-center font-medium text-[#776400] transition hover:text-[#4b332c] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={syncEnabled && !isPresenter}
                      type="button"
                    >
                      查看詳情 →
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {selectedTimeline ? (
              <article className="mt-8 grid gap-6 border-[4px] border-[#ffd400] bg-[#f7f4ec] px-5 py-6 md:mt-20 md:grid-cols-[minmax(0,360px)_1fr] md:items-center md:px-10 md:py-10">
                {selectedTimeline.imgUrl ? (
                  <button
                    aria-label={`放大檢視 ${selectedTimeline.title}`}
                    className="group cursor-zoom-in text-left"
                    onClick={() => setLightboxImage(selectedTimeline)}
                    type="button"
                  >
                    <img
                      alt={selectedTimeline.title}
                      className="w-full border-[3px] border-[#5b4038] bg-white object-cover shadow-[4px_4px_0_#3d2c24] transition group-hover:brightness-95"
                      src={selectedTimeline.imgUrl}
                    />
                  </button>
                ) : null}
                <div className={selectedTimeline.imgUrl ? '' : 'md:col-span-2'}>
                  <h3 className="text-2xl font-medium md:text-3xl">{selectedTimeline.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#5f5a50] md:text-lg md:leading-8">
                    {selectedTimeline.content}
                  </p>
                </div>
              </article>
            ) : null}
          </div>
        </section>

        {lightboxImage?.imgUrl ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxImage(null)}
            role="presentation"
          >
            <div className="relative max-h-full w-full max-w-6xl">
              <button
                aria-label="關閉圖片"
                className="absolute right-0 top-0 z-10 border-[3px] border-[#4b332c] bg-[#ffd400] px-4 py-2 text-sm font-bold text-[#776400] shadow-[3px_3px_0_#3d2c24]"
                onClick={() => setLightboxImage(null)}
                type="button"
              >
                關閉
              </button>
              <img
                alt={lightboxImage.title}
                className="max-h-[88vh] w-full border-[4px] border-[#ffd400] bg-white object-contain shadow-[6px_6px_0_#3d2c24]"
                onClick={(event) => event.stopPropagation()}
                src={lightboxImage.imgUrl}
              />
            </div>
          </div>
        ) : null}

        <footer className="border-t-[4px] border-[#6b652d] bg-[#eee8b3] px-4 py-10 text-[#9b9564] md:px-16">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black">PixelTales Studio</h2>
              <p className="mt-2 text-sm font-bold tracking-[0.08em]">
                Made with pixel love © 2024 PixelTales Studio
              </p>
            </div>
            <nav className="flex gap-8 text-sm font-bold">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Support</a>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
