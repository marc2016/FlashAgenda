import { Composition, staticFile } from "remotion";
import { DREHBUECHER } from "./drehbuecher";
import { Video } from "./Video";
import { FPS, gesamtFrames, type Szenen, type Ton } from "./zeitplan";

/** Loads a JSON file from public/; falls back to `ersatz` if missing. */
const laden = <T,>(datei: string, ersatz: T): Promise<T> =>
  fetch(staticFile(datei)).then((r) => (r.ok ? r.json() : ersatz), () => ersatz);

export const Root = () => (
  <>
    {Object.entries(DREHBUECHER).map(([video, d]) => (
      <Composition
        key={video}
        id={d.id}
        component={Video}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ video, szenen: {} as Szenen, ton: { stimmen: {} } as Ton }}
        calculateMetadata={async () => {
          const szenen = await laden<Szenen>(`${d.ordner}aufnahmen/szenen.json`, {});
          const ton = await laden<Ton>(`${d.ordner}ton/ton.json`, { stimmen: {} });
          return { durationInFrames: gesamtFrames(d, szenen, ton), props: { video, szenen, ton } };
        }}
      />
    ))}
  </>
);
