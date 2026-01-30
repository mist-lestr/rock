import { Label } from "@/components/ui/label";
import { KubeObject } from "lestr-plugin"

export default function Home() {


  class Pods extends KubeObject {
    static kind = 'pods';
    static apiName = 'Pod';
    static apiVersion = 'v1';
    static isNamespaced = true;
  }

  Pods.useList().then((res) =>
    console.log("List pods", res)
  ).catch((error) => {
    console.log("List pods", error)
  })

  return (
    <Label>Bonjour</Label>
  )
}

