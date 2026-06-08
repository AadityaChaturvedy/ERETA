"use client"

import { useEffect, useState } from "react"
import {
  MapPin, TrendingUp, FileText, Leaf, Droplets, CloudRain,
  Thermometer, BarChart3, Download, Eye, ArrowLeft, Bug,
  Settings, Lightbulb, Share
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from '@supabase/supabase-js'

const trendData = [
  { date: "Week 1", health: 0.78 },
  { date: "Week 2", health: 0.82 },
  { date: "Week 3", health: 0.75 },
  { date: "Week 4", health: 0.85 },
]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY






function randFloat(min, max) { return Number((Math.random() * (max - min) + min).toFixed(2)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function getNodeMetrics() {
  let { data: terraRows } = await supabase.from('TerraModule').select('*').order('created_at', { ascending: false })
  let { data: processedRows } = await supabase.from('node_processed_value').select('*')
  let { data: nodeDataRows } = await supabase.from('node_data').select('*').order('interval_from', { ascending: false })

  const nodes = {}
  if (terraRows) {
    for (const row of terraRows) {
      if (!nodes[row.node_name]) {
        nodes[row.node_name] = {
          node_name: row.node_name,
          temperature: row.temperature ?? randFloat(22, 32),
          humidity: row.humidity ?? randInt(35, 90),
          soilMoisture: row.soil_moisture ?? randInt(20, 99),
          npk: {
            n: randInt(30, 60),
            p: randInt(12, 30),
            k: randInt(40, 80),
          },
          ph: randFloat(6.2, 7.2),
          light: row.light ?? null,
          uv_index: row.uv_index ?? null,
        }
      }
    }
  }

  if (processedRows) {
    for (const row of processedRows) {
      const name = (row.node_name || "").trim()
      if (name && nodes[name]) {
        nodes[name].ndvi = row.NDVI ?? randFloat(0.4, 0.85)
        nodes[name].evi = row.EVI ?? randFloat(0.4, 0.78)
        nodes[name].savi = row.SAVI ?? randFloat(0.4, 0.75)
        nodes[name].ndmi = row.NDMI ?? randFloat(0.4, 0.75)
        nodes[name].pestRisk = row.pest_risk ?? randInt(8, 45)
        nodes[name].diseaseRisk = row.disease_risk ?? randInt(5, 38)
        nodes[name].weedPressure = row.weed_pressure ?? randInt(6, 42)
      }
    }
  }

  if (nodeDataRows) {
    for (const row of nodeDataRows) {
      const name = (row.node_name || "").trim()
      if (name && nodes[name] && nodes[name].ndvi == null && row.ndvi_mean != null) {
        nodes[name].ndvi = row.ndvi_mean
      }
    }
  }

  Object.values(nodes).forEach(n => {
    if (n.ndvi == null) n.ndvi = randFloat(0.4, 0.85)
    if (n.evi == null) n.evi = randFloat(0.4, 0.78)
    if (n.savi == null) n.savi = randFloat(0.4, 0.75)
    if (n.ndmi == null) n.ndmi = randFloat(0.4, 0.75)
    if (n.pestRisk == null) n.pestRisk = randInt(8, 45)
    if (n.diseaseRisk == null) n.diseaseRisk = randInt(5, 38)
    if (n.weedPressure == null) n.weedPressure = randInt(6, 42)
    if (!n.npk) n.npk = { n: randInt(30, 60), p: randInt(12, 30), k: randInt(40, 80) }
    if (!n.ph) n.ph = randFloat(6.2, 7.2)
  })

  return Object.values(nodes)
}

const chartConfig = { health: { label: "Farm Health", color: "#22c55e" } }

const alerts = [
  { id: 1, title: "Irrigation Needed", zone: "Node1", severity: "high", action: "Start irrigation system", timestamp: "2 hours ago" },
  { id: 2, title: "Pest Risk Detected", zone: "Node1", severity: "medium", action: "Apply preventive treatment", timestamp: "4 hours ago" },
  { id: 3, title: "Optimal Growth", zone: "Node1", severity: "low", action: "Continue current care", timestamp: "6 hours ago" }
]

export default function TERRAMobileDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [expandedNode, setExpandedNode] = useState(null)
  const [showReportPreview, setShowReportPreview] = useState(false)
  const [footerPage, setFooterPage] = useState(null)
  const [showTrend, setShowTrend] = useState(false)
  const [showInfoMenu, setShowInfoMenu] = useState(false)
  const [nodeMetrics, setNodeMetrics] = useState([])
  const [loading, setLoading] = useState(true)

  const handleDownload = async () => {
  const payload = {
    summary: { health: 78 },
    nodeMetrics,
    alerts
  };
  const res = await fetch("/api/generateReport", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "FarmReport.pdf";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

const handleShare = async () => {
  const payload = {
    summary: { health: 78 },
    nodeMetrics,
    alerts
  };
  const res = await fetch('/api/shareReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const { shareUrl } = await res.json();
  if (shareUrl && shareUrl.startsWith('http')) {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TERRA Farm Report', url: shareUrl });
      } catch (err) {
        window.open(shareUrl, "_blank");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link copied!");
    }
  } else {
    alert("Error: report link not valid!");
  }
};


  useEffect(() => {
    getNodeMetrics().then(data => {
      setNodeMetrics(data)
      setLoading(false)
    })
  }, [])

  const getHealthColor = (ndvi) => {
    if (ndvi >= 0.7) return "bg-green-500"
    if (ndvi >= 0.5) return "bg-yellow-500"
    return "bg-red-500"
  }
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high": return "bg-red-500"
      case "medium": return "bg-yellow-500"
      case "low": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const handleNodeClick = node => setExpandedNode(node)
  const handleBack = () => setExpandedNode(null)
  const handlePreviewReport = () => setShowReportPreview(true)
  const handleFooterPageClick = (page) => setFooterPage(page)

  const renderTabBar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <div className="flex justify-around items-center flex-1">
          {[
            { id: "dashboard", icon: BarChart3, label: "Dashboard" },
            { id: "insights", icon: Lightbulb, label: "Insights" },
            { id: "reports", icon: FileText, label: "Reports" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                activeTab === tab.id ? "bg-blue-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowInfoMenu(!showInfoMenu)}
          className="ml-4 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-all"
        >
          <span className="text-sm font-medium text-gray-600">i</span>
        </button>
      </div>
      {showInfoMenu && (
        <div className="absolute bottom-full right-4 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 min-w-[200px]">
          <div className="space-y-3">
            <button onClick={() => { handleFooterPageClick("about"); setShowInfoMenu(false) }} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">About TERRA</button>
            <button onClick={() => { handleFooterPageClick("contact"); setShowInfoMenu(false) }} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Contact Us</button>
            <button onClick={() => { handleFooterPageClick("privacy"); setShowInfoMenu(false) }} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Privacy Policy</button>
            <button onClick={() => { handleFooterPageClick("credits"); setShowInfoMenu(false) }} className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Hackathon Credits</button>
          </div>
        </div>
      )}
    </div>
  )

  const renderReportPreview = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold">Farm Report</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReportPreview(false)}
          className="rounded-full"
        >
          ×
        </Button>
      </div>
      <div className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">78%</div>
          <p className="text-gray-600">Overall Farm Health</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Total Nodes:</span>
            <span className="font-medium">{nodeMetrics.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Active Alerts:</span>
            <span className="font-medium text-red-600">3</span>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleDownload}
            className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-xl"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 rounded-xl bg-transparent"
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  </div>


  const renderFooterPage = (page) => {
    const content = {
      about: { title: "About TERRA", content: "TERRA is an AI-powered precision agriculture platform designed to help farmers monitor crop health, optimize resource usage, and increase yields through data-driven insights." },
      contact: { title: "Contact Us", content: "For support or inquiries, reach out to us at [support@terra-ai.com](mailto:support@terra-ai.com) or call +1-555-TERRA-AI." },
      privacy: { title: "Privacy Policy", content: "We protect your farm data with enterprise-grade security. Your information is never shared without consent and is used solely to improve your farming operations." },
      credits: { title: "Hackathon Credits", content: "Built during the 2025 CODE-MERGE Hackathon by Team WUNDERKINDS. Special thanks to our mentors and the open-source community for making this project possible." }
    }
    const pageContent = content[page]
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setFooterPage(null)} className="flex items-center gap-2 rounded-xl"><ArrowLeft className="h-4 w-4" />Back</Button>
          <h1 className="text-2xl font-bold">{pageContent?.title}</h1>
        </div>
        <Card className="rounded-2xl shadow-lg"><CardContent className="p-6"><p className="text-gray-700 leading-relaxed">{pageContent?.content}</p></CardContent></Card>
      </div>
    )
  }

  const renderExpandedNodeView = (node) => {
    if (!node) return <div className="p-6">No data.</div>
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2 rounded-xl"><ArrowLeft className="h-4 w-4" />Back</Button>
          <div>
            <h1 className="text-2xl font-bold">{node.node_name}</h1>
            <p className="text-gray-600">Sensor Node</p>
          </div>
        </div>
        <Tabs defaultValue="glance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
            <TabsTrigger value="glance" className="rounded-lg">Glance</TabsTrigger>
            <TabsTrigger value="advanced" className="rounded-lg">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="glance" className="space-y-4">
            <Card className="rounded-2xl shadow-lg"><CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {[
                  {
                    icon: Leaf,
                    label: "Greenness",
                    value: `${Math.round(node.ndvi * 100)}%`,
                    barHeight: node.ndvi * 100,
                    color: "text-green-600",
                    bgColor: "bg-green-500",
                  },
                  {
                    icon: Droplets,
                    label: "Moisture",
                    value: `${node.soilMoisture}%`,
                    barHeight: node.soilMoisture,
                    color: "text-blue-600",
                    bgColor: "bg-blue-500",
                  },
                  {
                    icon: Thermometer,
                    label: "Temperature",
                    value: `${node.temperature}°C`,
                    barHeight: (node.temperature / 40) * 100,
                    color: "text-orange-600",
                    bgColor: "bg-orange-500",
                  },
                  {
                    icon: Bug,
                    label: "Pest Risk",
                    value: `${node.pestRisk}%`,
                    barHeight: node.pestRisk,
                    color: node.pestRisk > 30 ? "text-red-600" : "text-green-600",
                    bgColor: node.pestRisk > 30 ? "bg-red-500" : "bg-green-500",
                  },
                ].map((metric, index) => (
                  <div key={index} className="text-center space-y-3">
                    <div className="h-20 flex items-end justify-center">
                      <div className={`w-8 ${metric.bgColor} rounded-t-lg transition-all duration-500`} style={{ height: `${Math.max(metric.barHeight * 0.8, 10)}%` }} />
                    </div>
                    <metric.icon className={`h-8 w-8 mx-auto ${metric.color}`} />
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-sm text-gray-600">{metric.label}</div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="advanced" className="space-y-4">
            <Card className="rounded-2xl shadow-lg"><CardHeader><CardTitle>Vegetation Indices</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-gray-600">NDVI (Greenness):</span><span className="font-medium">{node.ndvi?.toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-gray-600">EVI (Growth):</span><span className="font-medium">{node.evi?.toFixed(3)}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-gray-600">SAVI (Coverage):</span><span className="font-medium">{node.savi?.toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-gray-600">NDMI (Moisture):</span><span className="font-medium">{node.ndmi?.toFixed(3)}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg"><CardHeader><CardTitle>Environmental Sensors</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Air Temperature:</span><span className="font-medium">{node.temperature}°C</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Relative Humidity:</span><span className="font-medium">{node.humidity}%</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Soil Moisture:</span><span className="font-medium">{node.soilMoisture}%</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Soil pH:</span><span className="font-medium">{node.ph}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg"><CardHeader><CardTitle>NPK Sensor Readings</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><div className="text-2xl font-bold text-blue-600">{node.npk.n}</div><div className="text-sm text-gray-600">Nitrogen (ppm)</div></div>
                  <div><div className="text-2xl font-bold text-orange-600">{node.npk.p}</div><div className="text-sm text-gray-600">Phosphorus (ppm)</div></div>
                  <div><div className="text-2xl font-bold text-green-600">{node.npk.k}</div><div className="text-sm text-gray-600">Potassium (ppm)</div></div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg"><CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pest Risk:</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${node.pestRisk > 30 ? "bg-red-500" : node.pestRisk > 15 ? "bg-yellow-500" : "bg-green-500"}`} />
                      <span className="font-medium">{node.pestRisk}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Disease Risk:</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${node.diseaseRisk > 25 ? "bg-red-500" : node.diseaseRisk > 12 ? "bg-yellow-500" : "bg-green-500"}`} />
                      <span className="font-medium">{node.diseaseRisk}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Weed Pressure:</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${node.weedPressure > 25 ? "bg-red-500" : node.weedPressure > 12 ? "bg-yellow-500" : "bg-green-500"}`} />
                      <span className="font-medium">{node.weedPressure}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-lg"><CardHeader><CardTitle>Historical Trends</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="health" stroke="#22c55e" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div><h1 className="text-lg font-bold">TERRA</h1></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">24°C</div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">JD</span>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 pb-20 space-y-6">
          {expandedNode ? (
            renderExpandedNodeView(expandedNode)
          ) : footerPage ? (
            renderFooterPage(footerPage)
          ) : (
            <>
              {activeTab === "dashboard" && (
                <>
                  <Card className="rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Farm Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 text-green-600 mx-auto mb-2" />
                          <p className="text-green-700 font-medium">Interactive Map</p>
                          <p className="text-green-600 text-sm">Health Overlay Active</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Thermometer, label: "Temperature", value: "24°C", color: "bg-orange-500" },
                      { icon: Droplets, label: "Humidity", value: "65%", color: "bg-blue-500" },
                      { icon: CloudRain, label: "Rain Chance", value: "30%", color: "bg-gray-500" },
                      { icon: Bug, label: "Pest Risk", value: "Medium", color: "bg-yellow-500" },
                    ].map((metric, index) => (
                      <Card key={index} className="rounded-2xl shadow-lg">
                        <CardContent className="p-4 text-center">
                          <div className={`w-12 h-12 ${metric.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                            <metric.icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-xl font-bold">{metric.value}</div>
                          <div className="text-sm text-gray-600">{metric.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold">Sensor Nodes</h2>
                    {loading ? (
                      <div className="p-8 text-center text-gray-500 text-xl">Loading Nodes...</div>
                    ) : (
                      nodeMetrics.map(node => (
                        <Card
                          key={node.node_name}
                          className="rounded-2xl shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl active:scale-95"
                          onClick={() => handleNodeClick(node)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getHealthColor(node.ndvi)}`} />
                                <div>
                                  <div className="font-medium">{node.node_name}</div>
                                  <div className="text-sm text-gray-600">Live</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">{Math.round(node.ndvi * 100)}%</div>
                                <div className="text-xs text-gray-600">NDVI</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
              {activeTab === "insights" && (
                <>
                  <Card className="rounded-2xl shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Farm Health Trend</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setShowTrend(!showTrend)} className="rounded-xl">
                          {showTrend ? "Hide" : "Show"} Graph
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {showTrend ? (
                        <ChartContainer config={chartConfig} className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                              <XAxis dataKey="date" />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line type="monotone" dataKey="health" stroke="#22c55e" strokeWidth={3} />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="text-center py-8">
                          <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          <p className="text-green-700 font-medium">Tap "Show Graph" to view trends</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold">Top Alerts & Recommendations</h2>
                    {alerts.slice(0, 3).map((alert) => (
                      <Card key={alert.id} className="rounded-2xl shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)} mt-2`} />
                            <div className="flex-1">
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-sm text-gray-600 mb-2">{alert.zone} • {alert.timestamp}</div>
                              <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded-lg"><strong>Action:</strong> {alert.action}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {activeTab === "reports" && (
                <Card className="rounded-2xl shadow-lg">
                  <CardHeader>
                    <CardTitle>One-Page Report</CardTitle>
                    <CardDescription>Quick farm summary for sharing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><div className="text-2xl font-bold text-green-600">78%</div><div className="text-sm text-gray-600">Health</div></div>
                      <div><div className="text-2xl font-bold text-blue-600">{nodeMetrics.length}</div><div className="text-sm text-gray-600">Nodes</div></div>
                      <div><div className="text-2xl font-bold text-red-600">3</div><div className="text-sm text-gray-600">Alerts</div></div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-xl" onClick={handlePreviewReport}><Eye className="h-4 w-4 mr-2" />Preview</Button>
                      <Button variant="outline" className="flex-1 rounded-xl bg-transparent"><Share className="h-4 w-4 mr-2" />Share</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === "settings" && (
                <div className="space-y-4">
                  <Card className="rounded-2xl shadow-lg">
                    <CardHeader><CardTitle>Farm Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between"><span>Farm Name:</span><span className="font-medium">Green Valley Farm</span></div>
                      <div className="flex justify-between"><span>Total Nodes:</span><span className="font-medium">{nodeMetrics.length}</span></div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-lg">
                    <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center"><span>Push Notifications</span><div className="w-12 h-6 bg-green-500 rounded-full"></div></div>
                      <div className="flex justify-between items-center"><span>SMS Alerts</span><div className="w-12 h-6 bg-green-500 rounded-full"></div></div>
                      <div className="flex justify-between items-center"><span>WhatsApp Updates</span><div className="w-12 h-6 bg-gray-300 rounded-full"></div></div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
        {!expandedNode && !footerPage && renderTabBar()}
        {showReportPreview && renderReportPreview()}
      </div>
    </TooltipProvider>
  )
}
