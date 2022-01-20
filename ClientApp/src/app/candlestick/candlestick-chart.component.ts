
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';
import {
  FetchDataService,
  HistoricData,
  RawHistoricData
} from '../fetch-data/fetch-data.service';
import * as d3 from 'd3';
import { AxisDomain } from 'd3';

@Component({
    selector: 'candlestick-chart',
    templateUrl: './candlestick-chart.component.html',
    styleUrls: ['./candlestick-chart.component.css']
  })
export class CandlestickChartComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy{

  @ViewChild('candlestickChart', { static: true }) candlestickChart?: ElementRef;
  private candles: d3.Selection<SVGRectElement, RawHistoricData, SVGElement, unknown> | undefined;
  private clipPath: d3.Selection<any, unknown, null, undefined> | undefined;
  private candleFill: string = "green";
  public displayDate: string | undefined;
  public displayPrice: string | undefined;
  private el: HTMLElement;
  private gY: d3.Selection<SVGGElement, any, any, any> | undefined;
  private gX: d3.Selection<SVGElement, unknown, HTMLElement, any> | undefined;
  public leftCrosshairWidth: number = 0;
  private leftOffSet: number | undefined;
  public rightCrosshairWidth: number = 0;
  public topCrosshairHeight: number = 0;
  public bottomCrosshairHeight: number = 0;
  public mouseWidthOffset: number = 30;
  public mouseHeightOffset: number = 30;
  public mouseTopBias: number = 5.5;
  public mouseLeftBias: number = 1.5;
  public showCrossHair: boolean = false;
  public mouseOnChart: boolean = true;
  private data: RawHistoricData[] = [];
  private filteredData: RawHistoricData[] = [];
  public filterDate: number | undefined;
  private extent: [[number, number], [number, number]] | undefined
  private margin: { top: number, bottom: number, left: number; right: number } = { top: 10, bottom: 40, left: 30, right: 80 };
  private dateFormat: string = "%Y-%m-%dT%H:%M:%S";
  private onInint: boolean = true;
  private months: any = { 0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec' }
  private x1?: number | undefined;
  private x2?: number | undefined;
  private xM?: number | undefined;
  private y1?: number | undefined;
  private y2?: number | undefined;
  private yM?: number | undefined;
  private xMin?: Date | undefined;
  private xMax?: Date | undefined;

  private xMinIdx: number | undefined;
  private xMaxIdx: number | undefined;
  private xScale: d3.ScaleLinear<number, number, never>;
  private xAxis: d3.Axis<d3.AxisDomain>;
  private xPadding: number = 0.5;
  private yMin?: number | undefined;
  private yMax?: number | undefined;
  private xBand: d3.ScaleBand<string>;
  public yScale: d3.ScaleLinear<number, number, never>;
  private yAxis: d3.Axis<AxisDomain> | undefined;
  public dates: Date[] | undefined;
  private datesStrings: string[] | undefined;
  private jsDates: Date[] | undefined;
  private selectedTimeFilter: [string, string, string] = ['selectedTimeFilter', 'YTD', 'YTD'];
  private svg?: d3.Selection<any, unknown, null, undefined> | undefined;
  private svgElement?: HTMLElement | undefined;
  private svgTop?: number | undefined;
  private svgLeft?: number | undefined;
  private svgRight?: number | undefined;
  private svgBottom?: number | undefined;
  private stems: d3.Selection<SVGLineElement, RawHistoricData, SVGElement, unknown> | undefined;
  private topOffset: number | undefined;
  private transitionDuration: number = 300;
  private defaultWidth: number = 1000;
  private defaultHeight: number = 900;
  private xScaleFactor: number | undefined;
  private yScaleFactor: number | undefined;
  private zoom: d3.ZoomBehavior<Element, unknown> | undefined;

  constructor(
    private _renderer: Renderer2,
    private _fetchDataService: FetchDataService
      ) {
  }

  

  ngOnInit(): void {
    this.data = this._fetchDataService.getHistoricDataList();
    this.data.forEach(d => {
      d.date = new Date(d.date)
    });
    console.log(this.data)
  }

  ngAfterViewInit() {
    this.svg = d3.select(this.candlestickChart?.nativeElement);
    this.setElementDimensions(window.innerHeight, window.innerWidth);
    console.log(this.data);
    this.getDates(this.data);
    this.drawChart(this.data, this.onInint); 
  }

  ngOnChanges() {
  }

  ngOnDestroy() {
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
    this.svgTop = rect.top;
    this.svgLeft = rect.left;
    this.svgRight = rect.right;
    this.svgBottom = rect.bottom;
    let setHeight: number = windowHeight - rect.top;
    let setWidth: number = windowWidth - rect.left;
    this.candlestickChart.nativeElement.style.height = setHeight + 'px';
    this.candlestickChart.nativeElement.style.width = setWidth + 'px';
  }

  private getDates(data: RawHistoricData[]): void {
    var dateFormat = d3.timeParse(this.dateFormat);
    for (var i = 0; i < data.length; i++) {
      var dateString = data[i].date.toString();
      data[i].date = dateFormat(dateString);
    }
    this.dates = data.map(d => {
      return d.date
    });
    this.datesStrings = data.map(d => {
      return d.date.toString();
    });
  }

  private setMaxValue(data: RawHistoricData[], property: string) {
    return d3.max(data.map(r => r[property]));
  }

  private setMinValue(data: RawHistoricData[], property: string) {
    return d3.min(data.map(r => r[property]));
  }

  private drawChart(data: RawHistoricData[], init: boolean): void {
    this.xMin = this.setMinValue(data, "date");
    this.xMax = this.setMaxValue(data, "date");
    var minP = +this.setMinValue(data, "low");
    var maxP = +this.setMaxValue(data, "high");
    var buffer = (maxP - minP) * 0.1;
    this.yMin = minP - buffer;
    this.yMax = maxP + buffer;
    this.xMinIdx = 0;
    this.xMaxIdx = data.length;
    this.filteredData = data;
    this.yScale = d3.scaleLinear().domain([this.yMin, this.yMax]).range([this.innerHeight(this.defaultHeight), 0]).nice();
    this.yMin = this.yScale.domain()[0];
    this.yMax = this.yScale.domain()[1];
    this.yScaleFactor = (this.yMax - this.yMin) / this.innerHeight(this.defaultHeight);
    this.xScale = d3.scaleLinear([0, this.innerWidth(this.defaultWidth)]).domain([this.xMinIdx, this.xMaxIdx]);
    this.xBand = d3.scaleBand([0, this.innerWidth(this.defaultWidth)]).domain(this.datesStrings).padding(this.xPadding);
    this.yAxis = d3.axisRight(this.yScale).tickFormat(d3.format(",.2f"));
    this.xAxis = d3.axisBottom(this.xScale)
      .tickFormat((d: number) => {
        var date: Date = new Date(this.dates[d]);
        return date.getDate() + ' ' + this.months[date.getMonth()] + date.getFullYear().toString().substring(2, 4)
      });

    if (!init) {
      this.svg.select<SVGGElement>('#xAxis')
        .transition()
        .duration(this.transitionDuration)
        .delay(this.transitionDuration)
        .attr('transform', `translate(${this.margin.left},${this.innerHeight(this.defaultHeight) + this.margin.top})`)
        .call(d3.axisBottom(this.xScale).tickFormat((d: number) => {
          if (d >= 0 && d <= this.dates.length - 1) {
            var date: Date = new Date(this.dates[d])
            var hours = date.getHours()
            return date.getDate() + ' ' + this.months[date.getMonth()] + date.getFullYear().toString().substring(2, 4)
          }
        }))
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

      this.gX = this.svg.append("g")
        .attr("id", "xAxis")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(${this.margin.left}, ${this.innerHeight(this.defaultHeight) + this.margin.top})`)
        .call(this.xAxis);

      this.gY = this.svg.append("g")
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
            .attr("x1", (d, i) => this.margin.left + this.xScale(i) - (this.xBand.bandwidth() / 2))
            .attr("x2", (d, i) => this.margin.left + this.xScale(i) - (this.xBand.bandwidth() / 2))
            .attr("y1", d => this.margin.top + this.yScale(d.high))
            .attr("y2", d => this.margin.top + this.yScale(d.low))
            .attr("stroke", d => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green")
        ,
        update =>
          update
            .attr("x1", (d, i) => this.margin.left + this.xScale(i) - (this.xBand.bandwidth() / 2))
            .attr("x2", (d, i) => this.margin.left + this.xScale(i) - (this.xBand.bandwidth() / 2))
            .attr("y1", d => this.margin.top + this.yScale(d.high))
            .attr("y2", d => this.margin.top + this.yScale(d.low))
            .attr("stroke", d => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green")
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
            .attr('x', (d, i) => this.margin.left + this.xScale(i) - this.xBand.bandwidth())
            .attr("class", "candle")
            .attr('y', d => this.margin.top + this.yScale(Math.max(d.open, d.close)))
            .attr('width', this.xBand.bandwidth())
            .attr('height', d => (d.open === d.close) ? 1 : this.yScale(Math.min(d.open, d.close)) - this.yScale(Math.max(d.open, d.close)))
            .attr("fill", d => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : this.candleFill)
            .attr("stroke", d => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green")
        ,
        update =>
          update
            .attr('x', (d, i) => this.margin.left + this.xScale(i) - this.xBand.bandwidth())
            .attr('y', d => this.margin.top + this.yScale(Math.max(d.open, d.close)))
            .attr('width', this.xBand.bandwidth())
            .attr('height', d => (d.open === d.close) ? 1 : this.yScale(Math.min(d.open, d.close)) - this.yScale(Math.max(d.open, d.close)))
            .attr("fill", d => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : this.candleFill)
            .attr("stroke", d => (d.open === d.close) ? "silver" : (d.open > d.close) ? "red" : "green")
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
      .on('zoom.end', (event) => this.zoomend(event));
    this.svg.call(this.zoom)

    this.svgElement = document.getElementById('candlestickChart');

  }

  private zoomed(event): void {
      var t = event.transform;
      let xScaleZ = t.rescaleX(this.xScale);
      if ((xScaleZ.domain()[1] - xScaleZ.domain()[0]) > 10) {
        let hideTicksWithoutLabel = function () {
          d3.selectAll('.xAxis .tick text').each(function (d: HTMLElement) {
            if (d.innerHTML === '') {
              d.parentElement.style.display = 'none';
            }
          })
        }

        this.gX.call(
          d3.axisBottom(xScaleZ).tickFormat((d: number) => {
            if (d >= 0 && d <= this.dates.length - 1) {
              var date: Date = new Date(this.dates[d])
              var hours: number = date.getHours()
              var minutes: string = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
              var amPM: string = hours < 13 ? 'am' : 'pm'
              return date.getDate() + ' ' + this.months[date.getMonth()] + date.getFullYear().toString().substring(2, 4)
            }
          })
        ).selectAll("path, line")
          .attr("stroke", 'azure');

        this.svg.selectAll("text")
          .attr("fill", 'azure');

        this.xMinIdx = +d3.format('0f')(xScaleZ.domain()[0]);
        this.xMaxIdx = +d3.format('0f')(xScaleZ.domain()[1]);;
        if (this.xMaxIdx === undefined) {
          this.xMaxIdx = this.dates.length;
        }
        if (0 > this.xMinIdx) {
          this.xMinIdx = 0;
        }
        this.candles = this.clipPath.selectAll(".candle");
        this.candles
          .attr("x", (d, i) => this.margin.left + xScaleZ(i) - (this.xBand.bandwidth() * t.k) / 2)
          .attr("width", this.xBand.bandwidth() * t.k);
        this.stems = this.clipPath.selectAll(".stem");
        this.stems
          .attr("x1", (d, i) => this.margin.left + xScaleZ(i))
          .attr("x2", (d, i) => this.margin.left + xScaleZ(i));
        hideTicksWithoutLabel();
      }
    
  }

  private zoomend(event): void {
    this.xMin = this.dates[this.xMinIdx];
    this.xMax = this.dates[this.xMaxIdx];
    var t = event.transform;
    var resizeTimer;
    let xScaleZ = t.rescaleX(this.xScale);
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if ((xScaleZ.domain()[1] - xScaleZ.domain()[0]) > 10) {
        if (this.xMax === undefined) {
          this.xMax = this.dates[this.dates.length - 1];
        }

        this.filteredData = this.data.filter(d => ((d.date >= this.xMin) && (d.date <= this.xMax)))
        var minP = +d3.min(this.filteredData, d => d.low)
        var maxP = +d3.max(this.filteredData, d => d.high)
        var buffer = (maxP - minP) * 0.1
        this.yMin = minP - buffer
        this.yMax = maxP + buffer
        const p = d3.precisionFixed(0.01);
        const f = d3.format("." + p + "f");
        this.yScale.domain([+f(this.yMin), +f(this.yMax)]).nice();
        this.yMin = this.yScale.domain()[0];
        this.yMax = this.yScale.domain()[1];
        this.yScaleFactor = (this.yMax - this.yMin) / this.innerHeight(this.defaultHeight);
        this.candles = this.clipPath.selectAll(".candle");
        this.candles.transition()
          .duration(this.transitionDuration)
          .attr("y", (d) => this.margin.top + this.yScale(Math.max(d[0].open, d[0].close)))
          .attr("height", (d) => (d[0].open === d[0].close) ? 1 : this.yScale(Math.min(d[0].open, d[0].close)) - this.yScale(Math.max(d[0].open, d[0].close)));
        this.stems = this.clipPath.selectAll(".stem");
        this.stems.transition()
          .duration(this.transitionDuration)
          .attr("y1", (d) => this.margin.top + this.yScale(d[0].high))
          .attr("y2", (d) => this.margin.top + this.yScale(d[0].low));

        this.gY.transition()
          .duration(this.transitionDuration)
          .call(d3.axisRight(this.yScale).tickFormat(d3.format(",.2f")))
          .selectAll("path, line")
          .attr("stroke", 'azure');

        this.svg.selectAll("text").transition()
          .duration(this.transitionDuration)
          .attr("fill", 'azure');
      }
    }, 500)
  
}

  private resizeChart(datesStrings: string[]) {
    var dates: Date[] = this.dates.slice(this.xMinIdx, this.xMaxIdx + 1);
    var datesStrings: string[] = this.datesStrings.slice(this.xMinIdx, this.xMaxIdx + 1);
    this.xMin = this.setMinValue(this.filteredData, "date");
    this.xMax = this.setMaxValue(this.filteredData, "date");
    var minP = +this.setMinValue(this.filteredData, "low")
    var maxP = +this.setMaxValue(this.filteredData, "high")
    var buffer = (maxP - minP) * 0.1
    this.yMin = minP - buffer
    this.yMax = maxP + buffer
    this.xScale = this.xScale.rangeRound([0, this.innerWidth(this.defaultWidth)]).domain([-1, dates.length]);
    this.yScale = this.yScale.rangeRound([this.innerHeight(this.defaultHeight), 0]);
    this.yMin = this.yScale.domain()[0];
    this.yMax = this.yScale.domain()[1];
    this.yScaleFactor = (this.yMax - this.yMin) / this.innerHeight(this.defaultHeight);
    this.xBand = d3.scaleBand([0, this.innerWidth(this.defaultWidth)]).domain(datesStrings).padding(this.xPadding);
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
      .call(d3.axisBottom(this.xScale).tickFormat((d: number) => {
        if (d >= 0 && d <= dates.length - 1) {
          var date: Date = new Date(dates[d])
          return date.getDate() + ' ' + this.months[date.getMonth()] + date.getFullYear().toString().substring(2, 4)
        }
      })).selectAll("path, line")
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
      .attr("x", (d, i) => this.margin.left + this.xScale(i) - (this.xBand.bandwidth()) / 2)
      .attr("width", this.xBand.bandwidth())
      .attr("y", (d) => this.margin.top + this.yScale(Math.max(d[0].open, d[0].close)))
      .attr("height", (d) => (d[0].open === d[0].close) ? 1 : this.yScale(Math.min(d[0].open, d[0].close)) - this.yScale(Math.max(d[0].open, d[0].close)));
    this.stems = this.clipPath.selectAll(".stem");
    this.stems
      .transition().ease(d3.easePolyInOut).duration(this.transitionDuration)
      .attr("y1", (d) => this.margin.top + this.yScale(d[0].high))
      .attr("y2", (d) => this.margin.top + this.yScale(d[0].low))
      .attr("x1", (d, i) => this.margin.left + this.xScale(i))
      .attr("x2", (d, i) => this.margin.left + this.xScale(i));
  }

}


