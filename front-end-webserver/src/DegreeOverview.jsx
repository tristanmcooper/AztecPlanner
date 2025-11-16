"use client"

import React, { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Label, ResponsiveContainer, Tooltip } from "recharts"

export default function DegreeOverview({ priorReq, userInfo }) {
  if (!priorReq || !userInfo) return null

  const gradData = {
    name: `${userInfo.firstName} ${userInfo.lastName}`,
    major: userInfo.major,
    gpa: userInfo.gpa,
  }

  // Calculate units (3 units per course)
  let completedUnits = 0
  let inProgressUnits = 0
  let totalUnitsRequired = 0

  Object.values(priorReq).forEach((req) => {
    const targetUnits = (req.target || 0) * 3
    const completed = Math.min((req.completed || 0) * 3, targetUnits)
    const inProgress = Math.min((req.progress || 0) * 3, targetUnits - completed)

    completedUnits += completed
    inProgressUnits += inProgress
    totalUnitsRequired += targetUnits
  })

  const notMetUnits = totalUnitsRequired - completedUnits - inProgressUnits

  const pieData = [
    { name: "Completed", value: completedUnits, color: "#22c55e" },
    { name: "In Progress", value: inProgressUnits, color: "#3b82f6" },
    { name: "Not Met", value: notMetUnits, color: "#e5e7eb" },
  ]

  // Helper to compute percentages for a requirement
  function getPercents(req) {
    if (!req || req.target === 0) {
      return { completedPercent: 100, inProgressPercent: 0 }
    }
    const completedPercent = Math.min((req.completed / req.target) * 100, 100)
    const inProgressPercent = Math.min(
      (req.progress / req.target) * 100,
      100 - completedPercent
    )
    return { completedPercent, inProgressPercent }
  }

  // Simple flag to animate bars from 0 -> target
  const [animateBars, setAnimateBars] = useState(false)

  useEffect(() => {
    // retrigger bar animation whenever requirements change
    setAnimateBars(false)
    const t = setTimeout(() => {
      setAnimateBars(true)
    }, 100) // tiny delay so they ramp in smoothly with the pie
    return () => clearTimeout(t)
  }, [priorReq])

  return (
    <div className="flex gap-6 h-[30vh]">
      {/* Information Section */}
      <div className="bg-white border rounded w-1/3 flex flex-col p-2">
        <h2 className="text-2xl font-bold mb-2">Information</h2>
        <div className="text-sm text-gray-700 space-y-1 overflow-y-auto">
          <p>
            <span className="font-semibold">Name:</span> {gradData.name}
          </p>
          <p>
            <span className="font-semibold">Major:</span> {gradData.major}
          </p>
          <p>
            <span className="font-semibold">GPA:</span> {gradData.gpa}
          </p>
          <p>
            <span className="font-semibold">Completed:</span> {completedUnits} units
          </p>
          <p>
            <span className="font-semibold">In Progress:</span>{" "}
            {inProgressUnits} units
          </p>
          <p>
            <span className="font-semibold">Not Met:</span> {notMetUnits} units
          </p>
        </div>
      </div>

      {/* Requirements Section */}
      <div className="bg-white border rounded flex-1 flex flex-col p-2 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">Requirements</h2>

        {/* Legend */}
        <div className="flex items-center space-x-4 mb-2 text-sm text-gray-700">
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-gray-200 rounded border" />
            <span>Not Met</span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-700 overflow-y-auto">
          {Object.entries(priorReq).map(([reqKey, req]) => {
            const { completedPercent, inProgressPercent } = getPercents(req)
            const displayName = req.name.replace(/\s*Requirement\s*$/i, "")

            return (
              <div key={reqKey} className="border-b pb-1">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">{displayName}</span>
                  <span>
                    {Math.min(req.completed, req.target)} / {req.target} Completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                  {/* Completed */}
                  <div
                    className="bg-green-500 h-3 absolute left-0 top-0"
                    style={{
                      width: animateBars ? `${completedPercent}%` : "0%",
                      transition: "width 1.3s ease-out",
                    }}
                  />
                  {/* In Progress */}
                  {inProgressPercent > 0 && (
                    <div
                      className="bg-blue-500 h-3 absolute top-0"
                      style={{
                        width: animateBars ? `${inProgressPercent}%` : "0%",
                        marginLeft: animateBars ? `${completedPercent}%` : "0%",
                        transition:
                          "width 1.3s ease-out, margin-left 1.3s ease-out",
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Donut Chart Section */}
      <div className="w-48 shrink-0 bg-white border rounded flex flex-col p-2 justify-start">
        <h2 className="text-2xl font-bold mb-2 text-center">Progress</h2>
        <div className="flex-1 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={1800}
                animationEasing="ease-out"
              >
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox && "cy" in viewBox)) return null
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground text-xl"
                      >
                        <tspan x={viewBox.cx} dy="0">
                          {completedUnits}/{totalUnitsRequired}
                        </tspan>
                        <tspan x={viewBox.cx} dy="1.2em" className="text-sm">
                          Units
                        </tspan>
                      </text>
                    )
                  }}
                />
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} units`, name]}
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
