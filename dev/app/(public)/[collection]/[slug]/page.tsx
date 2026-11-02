import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { RenderPage } from '../../../../components/RenderPage'
export default async function Page({ params }: { params: Promise<{ collection: string; slug: string }> }) {
  const { collection,slug } = await params
  if (!['pages','offers'].includes(collection)) notFound()
  const payload = await getPayload({ config })
  const result = await payload.find({ collection:collection as any, where:{ slug:{ equals:slug } }, draft:false, overrideAccess:false, depth:1, limit:1 })
  if (!result.docs[0]) notFound()
  return <RenderPage document={result.docs[0]} root={collection === 'pages' ? 'layout' : 'detailPage.layout'} />
}
