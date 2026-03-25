import * as XLSX from 'xlsx';
import { WarehouseConfig, LayoutItem } from '../types';

// Helper to calculate volume of an item in m3
const getItemVolumeCapacity = (item: LayoutItem, levelHeight: number): number => {
    const widthM = item.width / 100;
    const lengthM = item.height / 100; // item.height is length on 2D plane
    const heightM = (item.depth || (levelHeight - 50)) / 100;
    return parseFloat((widthM * lengthM * heightM).toFixed(2));
};

export const generateWarehouseExcelReport = (config: WarehouseConfig) => {
    const workbook = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
        ["Warehouse Inventory Report"],
        ["Project Name", config.name],
        ["Date", new Date().toLocaleDateString()],
        ["Total Area", `${config.dimensions.totalArea} m²`],
        [],
        ["Floor Summary"]
    ];

    config.levels.forEach(level => {
        const storageItems = level.items.filter(i => 
            ['rack', 'open_cabin', 'open_space_storage'].includes(i.type)
        );
        const totalLevelCapacityM3 = storageItems.reduce((sum, item) => sum + getItemVolumeCapacity(item, level.height), 0);
        const totalOccupiedM3 = storageItems.reduce((sum, item) => sum + (item.rackDetails?.volumeOccupied || 0), 0);
        
        summaryData.push([
            level.name, 
            `Total: ${totalLevelCapacityM3.toFixed(2)} m³`, 
            `Occupied: ${totalOccupiedM3.toFixed(2)} m³`, 
            `Available: ${(totalLevelCapacityM3 - totalOccupiedM3).toFixed(2)} m³`
        ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Detailed Sheets for each Floor
    config.levels.forEach(level => {
        const storageItems = level.items.filter(i => 
            ['rack', 'open_cabin', 'open_space_storage'].includes(i.type)
        );

        const tableData = [
            ["Unit ID", "Shipper Name", "Job #", "Status", "In Date", "Out Date", "Cycle", "Price (AED)", "Used m³", "Left m³", "Sales Person"]
        ];

        storageItems.forEach(item => {
            const details = item.rackDetails;
            const maxVol = getItemVolumeCapacity(item, level.height);
            const usedVol = details?.volumeOccupied || 0;
            const leftVol = maxVol - usedVol;

            if (details?.jobs && details.jobs.length > 0) {
                details.jobs.forEach(job => {
                    tableData.push([
                        item.label || item.id.split('-').pop() || '',
                        job.shipperName || '-',
                        job.jobNumber ? `AE ${job.jobNumber}` : '-',
                        (job.status || 'Active').toUpperCase(),
                        job.inDate || '-',
                        job.outDate || '-',
                        job.paymentCycle || '-',
                        (job.pricePerMonth || 0).toFixed(2),
                        usedVol.toString(),
                        leftVol.toFixed(2),
                        details.salesPerson || '-'
                    ]);
                });
            } else {
                tableData.push([
                    item.label || item.id.split('-').pop() || '',
                    details?.shipperName || '-',
                    details?.jobNumber ? `AE ${details.jobNumber}` : '-',
                    (details?.status || 'Available').toUpperCase(),
                    details?.inDate || '-',
                    details?.outDate || '-',
                    '-',
                    (details?.price || 0).toFixed(2),
                    usedVol.toString(),
                    leftVol.toFixed(2),
                    details?.salesPerson || '-'
                ]);
            }
        });

        const floorSheet = XLSX.utils.aoa_to_sheet(tableData);
        XLSX.utils.book_append_sheet(workbook, floorSheet, level.name.substring(0, 31)); // Sheet name limit 31 chars
    });

    XLSX.writeFile(workbook, `${config.name.replace(/\s+/g, '_')}_Inventory.xlsx`);
};
