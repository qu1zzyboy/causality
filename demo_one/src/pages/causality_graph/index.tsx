'use client';
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const EchartsGraphDemo = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState({
    directInviterCount: 0,
    indirectInviteCount: 0,
  });

  // 用于生成演示数据的函数
  const getMockData = () => {
    return {
      status: 'success',
      data: {
        total: {
          directInviterCount: 3,
          indirectInviteCount: 10,
        },
        nodes: [
          { id: 'User1', category: 'Center', symbolSize: 30, value: 8, name: 'User1' },
          { id: 'User2', category: 'Referrals', symbolSize: 20, value: 4, name: 'User2' },
          { id: 'User3', category: 'Referrals', symbolSize: 15, value: 2, name: 'User3' },
          { id: 'User4', category: 'Referrals', symbolSize: 10, value: 1, name: 'User4' },
          { id: 'User5', category: 'Referrals', symbolSize: 10, value: 1, name: 'User5' },
        ],
        links: [
          { source: 'User1', target: 'User2' },
          { source: 'User1', target: 'User3' },
          { source: 'User2', target: 'User4' },
          { source: 'User3', target: 'User5' },
        ],
      },
    };
  };

  useEffect(() => {
    if (chartRef.current) {
      const myChart = echarts.init(chartRef.current);

      // 模拟接口请求或数据获取
      const mockRes = getMockData();
      if (mockRes.status === 'success') {
        setTotal(mockRes.data.total);

        const nodes = mockRes.data.nodes;
        const links = mockRes.data.links;

        // 为每个节点加入 label 配置
        nodes.forEach((node: any) => {
          node.label = {
            show: true,
            formatter: node.name,
          };
        });

        // 根据数据中的 category，构造 category 数组
        const categories = [
          ...new Set(nodes.map((node: any) => node.category)),
        ].map((cat) => ({ name: cat }));

        // 设置图表配置
        const option = {
          tooltip: {
            formatter: (params: any) => {
              const data = params.data || {};
              if (data.name) {
                return `
                  <div>
                    <div>Id: ${data.id}</div>
                    <div>Name: ${data.name}</div>
                    <div>Invitations: ${data.value}</div>
                  </div>
                `;
              }
              return '';
            },
          },
          legend: [
            {
              data: categories.map((c) => c.name),
            },
          ],
          series: [
            {
              type: 'graph',
              layout: 'circular',
              data: nodes,
              links,
              categories,
              roam: true,
              label: {
                position: 'right',
              },
              lineStyle: {
                curveness: 0.3,
              },
            },
          ],
        };

        myChart.setOption(option);
      }

      // 卸载组件时销毁实例
      return () => {
        myChart.dispose();
      };
    }
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="w-full h-full flex flex-col sm:flex-row sm:justify-center p-4">
        <div ref={chartRef} className="w-full sm:w-3/4 h-2/3 sm:h-full" />
        <div className="w-full sm:w-1/4 text-gray-700 p-4">
          <p className="text-base sm:text-xl mb-2">
            Direct Referral: <span className="text-blue-600">{total.directInviterCount}</span>
          </p>
          <p className="text-base sm:text-xl mb-2">
            Indirect Referral: <span className="text-blue-600">{total.indirectInviteCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EchartsGraphDemo;