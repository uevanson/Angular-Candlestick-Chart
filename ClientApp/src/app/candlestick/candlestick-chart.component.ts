
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  FetchDataService,
  HistoricData,
  RawHistoricData
} from '../fetch-data/fetch-data.service';
import * as d3 from 'd3';
import { AxisDomain } from 'd3';
import { Subscription } from 'rxjs';

@Component({
    selector: 'candlestick-chart',
    templateUrl: './candlestick-chart.component.html',
  styleUrls: ['./candlestick-chart.component.css'],
  host: { '(window: resize)': 'onResize($event)' }
  })
export class CandlestickChartComponent implements OnInit, AfterViewInit, OnDestroy{

  private dataSubscription: Subscription;
  @ViewChild('candlestickChart', { static: true }) candlestickChart?: ElementRef;
  private candles: d3.Selection<SVGRectElement, RawHistoricData, SVGElement, unknown> | undefined;
  private clipPath: d3.Selection<any, unknown, null, undefined> | undefined;
  private candleFill: string = "green";
  private data: RawHistoricData[] | undefined;
  private filteredData: HistoricData[] | undefined;
  public filterDate: number | undefined;
  private extent: [[number, number], [number, number]] | undefined
  private margin: { top: number, bottom: number, left: number; right: number } = { top: 10, bottom: 40, left: 30, right: 80 };
  private dateFormat: string = "%Y-%m-%d";
  private onInint: boolean = true;
  private xMin?: Date | undefined;
  private xMax?: Date | undefined;
  private xRange: [number, number] | undefined;
  private xDomain: Date[] | undefined;
  private xFormat: string = "%b %-d";
  private xScale: d3.ScaleBand<Date> | undefined;
  private xTicks: Date[];
  private xAxis: d3.Axis<d3.AxisDomain> | undefined;
  private xPadding: number = 0.5;
  private yMin?: number | undefined;
  private yMax?: number | undefined;
  public yScale: d3.ScaleLinear<number, number, never>;
  private yAxis: d3.Axis<AxisDomain> | undefined;
  public dates: Date[] | undefined;
  private svg?: d3.Selection<any, unknown, null, undefined> | undefined;
  private stems: d3.Selection<SVGLineElement, RawHistoricData, SVGElement, unknown> | undefined;
  private transitionDuration: number = 300;
  private defaultWidth: number = 1000;
  private defaultHeight: number = 900;
  private zoom: d3.ZoomBehavior<Element, unknown> | undefined;

  constructor(
    private _fetchDataService: FetchDataService
      ) {
  }

  

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    this.svg = d3.select(this.candlestickChart?.nativeElement);
    this.setElementDimensions(window.innerHeight, window.innerWidth);
    this.dataSubscription = this._fetchDataService._teslaHistoricDataSource.subscribe(data => {
      this.data = data;
      var dateFormat = d3.utcParse(this.dateFormat);
      for (var i = 0; i < this.data.length; i++) {
        var dateString = this.data[i].date;
        this.data[i].date = dateFormat(dateString);
      }
      this.drawChart(this.data, this.onInint);
    })
  }


  ngOnDestroy(): void {
    this.dataSubscription.unsubscribe();
  }

  public onResize(event: any): void {
    this.setElementDimensions(window.innerHeight, window.innerWidth);
    this.resizeChart();
  }

  private innerWidth(defaultWidth: number): number {
    if (this.candlestickChart) {
      return this.candlestickChart.nativeElement.clientWidth - this.margin.left - this.margin.right;
    } else {
      return defaultWidth;
    }
  }

  private innerHeight(defaultHeight: number): number {
    if (this.candlestickChart) {
      return this.candlestickChart.nativeElement.clientHeight - this.margin.top - this.margin.bottom;
    } else {
      return defaultHeight;
    }
  }

  private setElementDimensions(windowHeight: number, windowWidth: number): void {
    var rect: DOMRect = this.candlestickChart.nativeElement.getBoundingClientRect();
    let setHeight: number = windowHeight - rect.top;
    let setWidth: number = windowWidth - rect.left;
    this.candlestickChart.nativeElement.style.height = setHeight + 'px';
    this.candlestickChart.nativeElement.style.width = setWidth + 'px';
  }

  private setMaxValue(data: HistoricData[], property: string): any {
    return d3.max(data.map(r => r[property]));
  }

  private setMinValue(data: HistoricData[], property: string): any {
    return d3.min(data.map(r => r[property]));
  }

  private drawChart(data: RawHistoricData[], init: boolean): void {
    
    this.xMin = this.setMinValue(data, "date");
    this.xMax = this.setMaxValue(data, "date");
    this.xRange = [0, this.innerWidth(this.defaultWidth)];
    this.xDomain = this.weekdaysScale(this.xMin, this.xMax, 1);
    this.xScale = d3.scaleBand(this.xDomain, this.xRange).padding(this.xPadding);
    this.xTicks = this.weeksScale(d3.min(this.xDomain), d3.max(this.xDomain), 2, 1);
    this.xAxis = d3.axisBottom(this.xScale).tickFormat(d3.utcFormat(this.xFormat)).tickValues(this.xTicks);
    var minP: number = +this.setMinValue(data, "low");
    var maxP: number = +this.setMaxValue(data, "high");
    var buffer = (maxP - minP) * 0.1;
    this.yMin = minP - buffer;
    this.yMax = maxP + buffer;
    this.filteredData = data;
    this.yScale = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.innerHeight(this.defaultHeight), 0]).nice();
    this.yMin = this.yScale.domain()[0];
    this.yMax = this.yScale.domain()[1];
    this.yAxis = d3.axisRight(this.yScale).tickFormat(d3.format(",.2f"));

    if (!init) {
      this.svg.select<SVGGElement>('#xAxis')
        .transition()
        .duration(this.transitionDuration)
        .delay(this.transitionDuration)
        .attr('transform', `translate(${this.margin.left},${this.innerHeight(this.defaultHeight) + this.margin.top})`)
        .call(d3.axisBottom(this.xScale).tickFormat(d3.utcFormat(this.xFormat)).tickValues(this.xTicks))
        .selectAll("path, line")
        .attr("stroke", 'azure');

      this.svg.select<SVGGElement>('#yAxis')
        .transition()
        .duration(this.transitionDuration)
        .delay(this.transitionDuration)
        .attr('transform', `translate(${this.innerWidth(this.defaultWidth) + this.margin.left}, ${this.margin.top})`)
        .call(d3.axisRight(this.yScale).tickFormat(d3.format(",.2f")))
        .selectAll("path, line")
        .attr("stroke", 'azure')

      this.svg.selectAll("text").transition()
        .duration(this.transitionDuration)
        .delay(this.transitionDuration)
        .attr("fill", 'azure')

    } else {
      this.svg.append("rect")
        .attr("id", "rect")
        .attr("width", this.innerWidth(this.defaultWidth))
        .attr("height", this.innerHeight(this.defaultHeight))
        .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr("clip-path", "url(#clip)");

        this.svg.append("g")
        .attr("id", "xAxis")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(${this.margin.left}, ${this.innerHeight(this.defaultHeight) + this.margin.top})`)
        .call(this.xAxis);

        this.svg.append("g")
        .attr("id", "yAxis")
        .attr("class", "axis y-axis")
        .attr("transform", `translate(${this.innerWidth(this.defaultWidth) + this.margin.left}, ${this.margin.top})`)
        .call(this.yAxis);

      this.clipPath = this.svg.append("g")
        .attr("class", "chartBody")
        .attr("clip-path", "url(#clip)");
    }

    this.clipPath.selectAll(".stem")
      .data(data)
      .join(
        enter =>
          enter
            .append("line")
            .attr("class", "stem")
            .attr("x1", (d: RawHistoricData) => { console.log(d.date); return this.margin.left + this.xScale(d.date); })
            .attr("x2", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) })
            .attr("y1", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.high) })
            .attr("y2", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.low) })
            .attr("stroke", (d: RawHistoricData) => { return (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green" })
        ,
        update =>
          update
            .attr("x1", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) })
            .attr("x2", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) })
            .attr("y1", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.high) })
            .attr("y2", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.low) })
            .attr("stroke", (d: RawHistoricData) => { return (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green" })
        ,
        exit =>
          exit.attr("opacity", 0)
            .attr("height", 0)
            .transition()
            .duration(this.transitionDuration)
            .remove()
      )

    this.clipPath.selectAll(".candle")
      .data(data)
      .join(
        enter =>
          enter
            .append("rect")
            .attr('x', (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) - this.xScale.bandwidth() / 2 })
            .attr("class", "candle")
            .attr('y', (d: RawHistoricData) => { return this.margin.top + this.yScale(Math.max(d.open, d.close)) })
            .attr('width', this.xScale.bandwidth())
            .attr('height', (d: RawHistoricData) => { return (d.open === d.close) ? 1 : this.yScale(Math.min(d.open, d.close)) - this.yScale(Math.max(d.open, d.close)) })
            .attr("fill", (d: RawHistoricData) => { return (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : this.candleFill })
            .attr("stroke", (d: RawHistoricData) => { return (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green" })
        ,
        update =>
          update
            .attr('x', (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) - this.xScale.bandwidth() / 2 })
            .attr('y', (d: RawHistoricData) => { return this.margin.top + this.yScale(Math.max(d.open, d.close)) })
            .attr('width', this.xScale.bandwidth())
            .attr('height', (d: RawHistoricData) => (d.open === d.close) ? 1 : this.yScale(Math.min(d.open, d.close)) - this.yScale(Math.max(d.open, d.close)))
            .attr("fill", (d: RawHistoricData) => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : this.candleFill)
            .attr("stroke", (d: RawHistoricData) => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green")
        ,
        exit =>
          exit
            .attr("height", 0)
            .attr("opacity", 0)
            .transition()
            .duration(this.transitionDuration)
            .remove()
    )

    this.svg.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", this.innerWidth(this.defaultWidth))
      .attr("height", this.innerHeight(this.defaultHeight))
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);      

    this.extent =  [[0, 0], [this.innerWidth(this.defaultWidth), this.innerHeight(this.defaultHeight)]];
    this.zoom = d3.zoom()
      .scaleExtent([1, 100])
      .translateExtent(this.extent)
      .extent(this.extent)
      .on('zoom', (event) => this.zoomed(event))
    this.svg.call(this.zoom)

  }

  private weeksScale(start: Date, stop: Date, stride: number, addDays: number): Date[] {
    return d3.utcMonday.every(stride).range(start, new Date(stop.setDate(stop.getDate() + addDays)));
  }
  private weekdaysScale(start: Date, stop: Date, addDays: number): Date[] {
    return d3.utcDays(start, new Date(stop.setDate(stop.getDate() + addDays)), 1).filter(d => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
  }

  private zoomed(event): void {
    this.xScale = this.xScale.range([0, this.innerWidth(this.defaultWidth)].map(d => event.transform.applyX(d)));
    this.yScale = this.yScale.range([this.innerHeight(this.defaultHeight), 0].map(d => event.transform.applyY(d)))
    this.candles = this.clipPath.selectAll(".candle");
    this.candles
      .transition().ease(d3.easePolyInOut).duration(this.transitionDuration)
      .attr("x", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) - this.xScale.bandwidth() / 2 })
      .attr("width", this.xScale.bandwidth())
      .attr("y", (d: RawHistoricData) => { return this.margin.top + this.yScale(Math.max(d.open, d.close)) })
      .attr("height", (d: RawHistoricData) => { return (d.open === d.close) ? 1 : this.yScale(Math.min(d.open, d.close)) - this.yScale(Math.max(d.open, d.close)) });
    this.stems = this.clipPath.selectAll(".stem");
    this.stems
      .transition().ease(d3.easePolyInOut).duration(this.transitionDuration)
      .attr("y1", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.high) })
      .attr("y2", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.low) })
      .attr("x1", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) })
      .attr("x2", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) });
    this.svg.selectAll(".x-axis").call(this.xAxis);
    this.svg.selectAll(".y-axis").call(this.yAxis);
  }

  private resizeChart(): void {
    this.xMin = this.setMinValue(this.filteredData, "date");
    this.xMax = this.setMaxValue(this.filteredData, "date");
    this.xRange = [0, this.innerWidth(this.defaultWidth)];
    this.xDomain = this.weekdaysScale(this.xMin, this.xMax, 0);
    this.xScale = d3.scaleBand(this.xDomain, this.xRange).padding(this.xPadding);
    this.xTicks = this.weeksScale(d3.min(this.xDomain), d3.max(this.xDomain), 2, 1);

    var minP: number = +this.setMinValue(this.filteredData, "low")
    var maxP: number = +this.setMaxValue(this.filteredData, "high")
    var buffer = (maxP - minP) * 0.1
    this.yMin = minP - buffer
    this.yMax = maxP + buffer
    this.yScale = this.yScale.rangeRound([this.innerHeight(this.defaultHeight), 0]);
    this.yMin = this.yScale.domain()[0];
    this.yMax = this.yScale.domain()[1];

    this.svg.select("#rect")
      .transition()
      .duration(0)
      .attr("width", this.innerWidth(this.defaultWidth))
      .attr("height", this.innerHeight(this.defaultHeight))
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
    this.svg.select("#clip rect")
      .transition()
      .duration(0)
      .attr("width", this.innerWidth(this.defaultWidth))
      .attr("height", this.innerHeight(this.defaultHeight))
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)

    this.svg.select<SVGGElement>('#xAxis')
      .transition().ease(d3.easePolyInOut)
      .duration(this.transitionDuration)
      .attr('transform', `translate(${this.margin.left},${this.innerHeight(this.defaultHeight) + this.margin.top})`)
      .call(this.xAxis = d3.axisBottom(this.xScale).tickFormat(d3.utcFormat(this.xFormat)).tickValues(this.xTicks)).selectAll("path, line")
      .attr("stroke", 'azure');

    this.svg.select<SVGGElement>('#yAxis')
      .transition().ease(d3.easePolyInOut)
      .duration(this.transitionDuration)
      .attr('transform', `translate(${this.innerWidth(this.defaultWidth) + this.margin.left}, ${this.margin.top})`)
      .call(d3.axisRight(this.yScale).tickFormat(d3.format(",.2f")))
      .selectAll("path, line")
      .attr("stroke", 'azure');

    this.svg.selectAll("text").transition()
      .duration(this.transitionDuration)
      .attr("fill", 'azure');

    this.candles = this.clipPath.selectAll(".candle");
    this.candles
      .transition().ease(d3.easePolyInOut).duration(this.transitionDuration)
      .attr("x", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) - this.xScale.bandwidth() / 2 })
      .attr("width", this.xScale.bandwidth())
      .attr("y", (d: RawHistoricData) => { return this.margin.top + this.yScale(Math.max(d.open, d.close)) })
      .attr("height", (d: RawHistoricData) => { return (d.open === d.close) ? 1 : this.yScale(Math.min(d.open, d.close)) - this.yScale(Math.max(d.open, d.close)) });
    this.stems = this.clipPath.selectAll(".stem");
    this.stems
      .transition().ease(d3.easePolyInOut).duration(this.transitionDuration)
      .attr("y1", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.high) })
      .attr("y2", (d: RawHistoricData) => { return this.margin.top + this.yScale(d.low) })
      .attr("x1", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) })
      .attr("x2", (d: RawHistoricData) => { return this.margin.left + this.xScale(d.date) });
  }

}


