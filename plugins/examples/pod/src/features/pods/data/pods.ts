import { Pod } from "./schema";

  export const loadFakeData = () => {
    const phases = ['Running', 'Pending', 'Succeeded', 'Failed', 'CrashLoopBackOff'];
    const namespaces = ['default', 'kube-system', 'monitoring', 'dev', 'prod'];

    // Helper to generate a random integer in [min, max]
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const rawPods: Pod[] = Array.from({ length: 20 }, (_, i) => {
      const name = `demo-pod-${i + 1}`;
      const ns = namespaces[randInt(0, namespaces.length - 1)];
      const phase = phases[randInt(0, phases.length - 1)];

      return {
        // The underlying KubeObject expects a `jsonData` field
        jsonData: {
          metadata: { name, namespace: ns, uid: `uid-${i + 1}` },
          spec: {} as any,
          status: {
            phase,
            conditions: [],
            containerStatuses: [],
            startTime: new Date(Date.now() - randInt(0, 86400000)).toISOString(), // up to 24 h ago
          },
        },
      } as unknown as Pod; // cast to satisfy the generic type
    });

    const fakePods = rawPods.map(raw => new Pod(raw.jsonData));

    // Simulate the shape returned by Pods.useList()
    console.log("fakePods", fakePods)
    return fakePods
  }
